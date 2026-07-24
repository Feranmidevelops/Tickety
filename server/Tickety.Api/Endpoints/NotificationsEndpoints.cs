using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Tickety.Api.Contracts;
using Tickety.Infrastructure.Data;

namespace Tickety.Api.Endpoints;

public static class NotificationsEndpoints
{
    public static void MapNotificationsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/notifications").WithTags("Notifications").RequireAuthorization();

        // The signed-in user's recent notifications, newest first.
        group.MapGet("/", async (ClaimsPrincipal principal, AppDbContext db) =>
        {
            var uid = principal.Uid();
            var rows = await db.Notifications.AsNoTracking()
                .Where(n => n.UserId == uid)
                .OrderByDescending(n => n.CreatedAtUtc)
                .Take(30)
                .Select(n => new NotificationDto(n.Id, n.Kind, n.Message, n.TicketId, n.CreatedAtUtc, n.ReadAtUtc))
                .ToListAsync();
            return Results.Ok(rows);
        });

        // Mark all of the user's unread notifications as read.
        group.MapPost("/read", async (ClaimsPrincipal principal, AppDbContext db) =>
        {
            var uid = principal.Uid();
            var now = DateTime.UtcNow;
            await db.Notifications
                .Where(n => n.UserId == uid && n.ReadAtUtc == null)
                .ExecuteUpdateAsync(s => s.SetProperty(n => n.ReadAtUtc, now));
            return Results.NoContent();
        });
    }
}
