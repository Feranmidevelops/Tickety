using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Tickety.Api.Contracts;
using Tickety.Api.Realtime;
using Tickety.Domain;
using Tickety.Domain.Entities;
using Tickety.Infrastructure.Data;

namespace Tickety.Api.Endpoints;

public static class TicketEndpoints
{
    public static void MapTicketEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/tickets").WithTags("Tickets").RequireAuthorization();

        // Create — any authenticated user (a requester raising a ticket).
        group.MapPost("/", async (
            CreateTicketRequest req,
            ClaimsPrincipal principal,
            AppDbContext db,
            INotificationService notify) =>
        {
            if (string.IsNullOrWhiteSpace(req.Title) || string.IsNullOrWhiteSpace(req.Description))
                return Results.BadRequest(new { error = "Title and description are required." });

            var now = DateTime.UtcNow;
            var ticket = new Ticket
            {
                Title = req.Title.Trim(),
                Description = req.Description.Trim(),
                Category = req.Category,
                Priority = req.Priority,
                RequesterId = principal.Uid()
            };
            ticket.MarkCreated(now);

            db.Tickets.Add(ticket);
            await db.SaveChangesAsync();

            var names = await db.NamesForAsync(ticket);
            var summary = ticket.ToSummary(names);
            await notify.TicketCreated(summary);
            return Results.Created($"/api/tickets/{ticket.Id}", ticket.ToDetail(names));
        });

        // List — role-scoped.
        group.MapGet("/", async (ClaimsPrincipal principal, AppDbContext db) =>
        {
            var uid = principal.Uid();
            var query = db.Tickets.AsNoTracking().AsQueryable();

            if (principal.IsInRole(Roles.Admin))
            {
                // all
            }
            else if (principal.IsInRole(Roles.Agent))
                query = query.Where(t => t.AssignedAgentId == null || t.AssignedAgentId == uid);
            else
                query = query.Where(t => t.RequesterId == uid);

            var tickets = await query.OrderByDescending(t => t.CreatedAtUtc).ToListAsync();
            var names = await db.NamesForAsync(tickets.ToArray());
            return Results.Ok(tickets.Select(t => t.ToSummary(names)));
        });

        // Detail — owner, assigned agent, or admin/agent.
        group.MapGet("/{id:int}", async (int id, ClaimsPrincipal principal, AppDbContext db) =>
        {
            var ticket = await db.Tickets.Include(t => t.Events)
                .AsNoTracking().FirstOrDefaultAsync(t => t.Id == id);
            if (ticket is null) return Results.NotFound();
            if (!principal.CanView(ticket)) return Results.Forbid();

            var names = await db.NamesForAsync(ticket);
            return Results.Ok(ticket.ToDetail(names));
        });

        // Accept — agent claims a ticket (assign self + move to In Progress).
        group.MapPost("/{id:int}/accept", async (
            int id, ClaimsPrincipal principal, AppDbContext db, INotificationService notify) =>
        {
            var ticket = await db.Tickets.Include(t => t.Events).FirstOrDefaultAsync(t => t.Id == id);
            if (ticket is null) return Results.NotFound();

            try { ticket.Accept(principal.Uid(), DateTime.UtcNow); }
            catch (InvalidTicketTransitionException ex) { return Results.BadRequest(new { error = ex.Message }); }

            await db.SaveChangesAsync();
            return await BroadcastAndReturn(ticket, db, notify);
        }).RequireAuthorization(p => p.RequireRole(Roles.Agent, Roles.Admin));

        // Assign / reassign to a specific agent.
        group.MapPost("/{id:int}/assign", async (
            int id, AssignRequest req, ClaimsPrincipal principal,
            AppDbContext db, INotificationService notify) =>
        {
            var ticket = await db.Tickets.Include(t => t.Events).FirstOrDefaultAsync(t => t.Id == id);
            if (ticket is null) return Results.NotFound();
            if (!await db.Users.AnyAsync(u => u.Id == req.AgentId))
                return Results.BadRequest(new { error = "Unknown agent." });

            ticket.Assign(req.AgentId, principal.Uid(), DateTime.UtcNow);
            await db.SaveChangesAsync();
            return await BroadcastAndReturn(ticket, db, notify);
        }).RequireAuthorization(p => p.RequireRole(Roles.Agent, Roles.Admin));

        // Change status via the domain state machine (also covers Resolve/Close/Reopen).
        group.MapPost("/{id:int}/status", async (
            int id, ChangeStatusRequest req, ClaimsPrincipal principal,
            AppDbContext db, INotificationService notify) =>
        {
            var ticket = await db.Tickets.Include(t => t.Events).FirstOrDefaultAsync(t => t.Id == id);
            if (ticket is null) return Results.NotFound();

            try { ticket.TransitionTo(req.Status, principal.Uid(), DateTime.UtcNow); }
            catch (InvalidTicketTransitionException ex) { return Results.BadRequest(new { error = ex.Message }); }

            await db.SaveChangesAsync();
            return await BroadcastAndReturn(ticket, db, notify);
        }).RequireAuthorization(p => p.RequireRole(Roles.Agent, Roles.Admin));
    }

    private static async Task<IResult> BroadcastAndReturn(Ticket ticket, AppDbContext db, INotificationService notify)
    {
        var names = await db.NamesForAsync(ticket);
        await notify.TicketUpdatedForQueue(ticket.ToSummary(names));
        var detail = ticket.ToDetail(names);
        await notify.TicketChanged(detail);
        return Results.Ok(detail);
    }
}

internal static class TicketEndpointHelpers
{
    public static string Uid(this ClaimsPrincipal p) => p.FindFirstValue(ClaimTypes.NameIdentifier)!;

    public static bool CanView(this ClaimsPrincipal p, Ticket t) =>
        p.IsInRole(Roles.Admin) || p.IsInRole(Roles.Agent) || t.RequesterId == p.Uid();

    /// <summary>Builds an id→display-name lookup covering every user referenced by the tickets
    /// (requesters, assignees, and event actors).</summary>
    public static async Task<IReadOnlyDictionary<string, string>> NamesForAsync(
        this AppDbContext db, params Ticket[] tickets)
    {
        var ids = new HashSet<string>();
        foreach (var t in tickets)
        {
            ids.Add(t.RequesterId);
            if (t.AssignedAgentId is not null) ids.Add(t.AssignedAgentId);
            foreach (var e in t.Events)
            {
                ids.Add(e.ActorId);
                // Assigned events keep the (historical) target agent id in the note.
                if (e.Type == TicketEventType.Assigned && e.Note is not null) ids.Add(e.Note);
            }
        }

        return await db.Users.AsNoTracking()
            .Where(u => ids.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.DisplayName);
    }
}
