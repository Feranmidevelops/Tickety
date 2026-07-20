using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Tickety.Api.Contracts;
using Tickety.Api.Email;
using Tickety.Domain;
using Tickety.Domain.Entities;
using Tickety.Infrastructure.Data;
using Tickety.Infrastructure.Email;
using Tickety.Infrastructure.Identity;

namespace Tickety.Api.Endpoints;

public static class InviteEndpoints
{
    public static void MapInviteEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/invites").WithTags("Invites");

        // Admin creates an invite, then emails the accept link. The link is also logged and
        // returned in the response so the admin can copy it if email delivery is off or fails.
        group.MapPost("/", async (
            CreateInviteRequest req,
            ClaimsPrincipal principal,
            AppDbContext db,
            UserManager<ApplicationUser> users,
            IEmailSender email,
            IConfiguration config,
            ILoggerFactory loggerFactory) =>
        {
            if (!Roles.All.Contains(req.Role))
                return Results.BadRequest(new { error = $"Unknown role '{req.Role}'." });

            if (await users.FindByEmailAsync(req.Email) is not null)
                return Results.Conflict(new { error = "A user with that email already exists." });

            var token = Guid.NewGuid().ToString("N");
            var invite = new Invite
            {
                Email = req.Email,
                Role = req.Role,
                Token = token,
                ExpiresAtUtc = DateTime.UtcNow.AddDays(7),
                CreatedByUserId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.Invites.Add(invite);
            await db.SaveChangesAsync();

            var clientUrl = config["ClientUrl"] ?? "http://localhost:5173";
            var acceptUrl = $"{clientUrl}/accept-invite?token={token}";
            var logger = loggerFactory.CreateLogger("Invites");
            logger.LogInformation("Invite for {Email} ({Role}): {Url}", req.Email, req.Role, acceptUrl);

            // Sending is best-effort: a mail failure (or email being disabled) must not fail the
            // invite — the accept link is still valid and returned for manual sharing.
            var (subject, html, text) = InviteEmail.Build(req.Role, acceptUrl, invite.ExpiresAtUtc);
            bool emailed = false;
            if (email.IsEnabled)
            {
                try
                {
                    await email.SendAsync(req.Email, subject, html, text);
                    emailed = true;
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Failed to email invite to {Email}. The accept link is still valid.", req.Email);
                }
            }

            return Results.Ok(new InviteCreatedResponse(
                token, acceptUrl, invite.Email, invite.Role, invite.ExpiresAtUtc, emailed));
        }).RequireAuthorization(policy => policy.RequireRole(Roles.Admin));

        // Public: validate a token so the accept page can show who it's for.
        group.MapGet("/{token}", async (string token, AppDbContext db) =>
        {
            var invite = await db.Invites.FirstOrDefaultAsync(i => i.Token == token);
            if (invite is null || !invite.IsUsable(DateTime.UtcNow))
                return Results.NotFound(new { error = "This invite link is invalid or has expired." });
            return Results.Ok(new InviteInfoResponse(invite.Email, invite.Role));
        });

        // Public: accept an invite, which creates the user and assigns the role.
        group.MapPost("/{token}/accept", async (
            string token,
            AcceptInviteRequest req,
            AppDbContext db,
            UserManager<ApplicationUser> users) =>
        {
            var invite = await db.Invites.FirstOrDefaultAsync(i => i.Token == token);
            if (invite is null || !invite.IsUsable(DateTime.UtcNow))
                return Results.NotFound(new { error = "This invite link is invalid or has expired." });

            var user = new ApplicationUser
            {
                UserName = invite.Email,
                Email = invite.Email,
                EmailConfirmed = true,
                DisplayName = string.IsNullOrWhiteSpace(req.DisplayName) ? invite.Email : req.DisplayName,
                IsActive = true
            };
            var create = await users.CreateAsync(user, req.Password);
            if (!create.Succeeded)
                return Results.BadRequest(new { errors = create.Errors.Select(e => e.Description) });

            await users.AddToRoleAsync(user, invite.Role);
            invite.AcceptedAtUtc = DateTime.UtcNow;
            await db.SaveChangesAsync();

            return Results.Ok(new { message = "Account created. You can now sign in." });
        });
    }
}
