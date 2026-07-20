using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Tickety.Api.Contracts;
using Tickety.Domain;
using Tickety.Infrastructure.Identity;

namespace Tickety.Api.Endpoints;

public static class AgentEndpoints
{
    public static void MapAgentEndpoints(this IEndpointRouteBuilder app)
    {
        // Agents/admins available for assignment — powers the assign dropdown.
        app.MapGet("/api/agents", async (UserManager<ApplicationUser> users) =>
        {
            var agents = await users.GetUsersInRoleAsync(Roles.Agent);
            var admins = await users.GetUsersInRoleAsync(Roles.Admin);
            var result = agents.Concat(admins)
                .Where(u => u.IsActive)
                .DistinctBy(u => u.Id)
                .OrderBy(u => u.DisplayName)
                .Select(u => new AgentDto(u.Id, u.DisplayName, u.Email!));
            return Results.Ok(result);
        })
        .WithTags("Agents")
        .RequireAuthorization(p => p.RequireRole(Roles.Agent, Roles.Admin));
    }
}
