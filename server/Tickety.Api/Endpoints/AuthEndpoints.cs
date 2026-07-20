using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Tickety.Api.Auth;
using Tickety.Api.Contracts;
using Tickety.Domain;
using Tickety.Infrastructure.Identity;

namespace Tickety.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        group.MapPost("/login", async (
            LoginRequest req,
            UserManager<ApplicationUser> users,
            JwtTokenService tokens) =>
        {
            var user = await users.FindByEmailAsync(req.Email);
            if (user is null || !user.IsActive || !await users.CheckPasswordAsync(user, req.Password))
                return Results.Unauthorized();

            var role = (await users.GetRolesAsync(user)).FirstOrDefault() ?? Roles.Requester;
            var (token, expires) = tokens.Create(user, role);
            return Results.Ok(new AuthResponse(token, expires,
                new UserDto(user.Id, user.Email!, user.DisplayName, role)));
        });

        group.MapGet("/me", async (ClaimsPrincipal principal, UserManager<ApplicationUser> users) =>
        {
            var user = await users.GetUserAsync(principal);
            if (user is null) return Results.Unauthorized();
            var role = principal.FindFirstValue(ClaimTypes.Role) ?? Roles.Requester;
            return Results.Ok(new UserDto(user.Id, user.Email!, user.DisplayName, role));
        }).RequireAuthorization();
    }
}
