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
    }
}
