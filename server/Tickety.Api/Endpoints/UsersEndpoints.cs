using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Tickety.Api.Contracts;
using Tickety.Api.Realtime;
using Tickety.Domain;
using Tickety.Infrastructure.Identity;

namespace Tickety.Api.Endpoints;

public static class UsersEndpoints
{
    public static void MapUsersEndpoints(this IEndpointRouteBuilder app)
    {
        // Full user roster with role + current presence — Admin only.
        app.MapGet("/api/users", async (UserManager<ApplicationUser> users, IPresenceTracker tracker) =>
        {
            var all = await users.Users.AsNoTracking().OrderBy(u => u.DisplayName).ToListAsync();
            var rows = new List<UserRow>(all.Count);
            foreach (var u in all)
            {
                var roles = await users.GetRolesAsync(u);
                rows.Add(new UserRow(
                    u.Id, u.DisplayName, u.Email!, roles.FirstOrDefault() ?? Roles.Requester,
                    u.IsActive, tracker.StatusOf(u.Id).ToString()));
            }
            return Results.Ok(rows);
        })
        .WithTags("Users")
        .RequireAuthorization(p => p.RequireRole(Roles.Admin));

        // Delete a user — Admin only, and you can't delete yourself.
        app.MapDelete("/api/users/{id}", async (
            string id, ClaimsPrincipal principal, UserManager<ApplicationUser> users) =>
        {
            if (id == principal.FindFirstValue(ClaimTypes.NameIdentifier))
                return Results.BadRequest(new { error = "You can't delete your own account." });

            var user = await users.FindByIdAsync(id);
            if (user is null) return Results.NotFound(new { error = "User not found." });

            var result = await users.DeleteAsync(user);
            if (!result.Succeeded)
                return Results.BadRequest(new { error = string.Join(", ", result.Errors.Select(e => e.Description)) });

            return Results.Ok(new { message = "User deleted." });
        })
        .WithTags("Users")
        .RequireAuthorization(p => p.RequireRole(Roles.Admin));
    }
}
