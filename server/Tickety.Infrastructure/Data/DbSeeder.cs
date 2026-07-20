using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Tickety.Domain;
using Tickety.Infrastructure.Identity;

namespace Tickety.Infrastructure.Data;

/// <summary>Applies migrations and seeds the role set plus a first Admin so the app is usable
/// on a clean database. Intended for Development startup.</summary>
public static class DbSeeder
{
    public const string DefaultAdminEmail = "admin@tickety.local";
    public const string DefaultAdminPassword = "Admin!23456";

    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var sp = scope.ServiceProvider;

        var db = sp.GetRequiredService<AppDbContext>();
        var logger = sp.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(DbSeeder));
        var roleManager = sp.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = sp.GetRequiredService<UserManager<ApplicationUser>>();

        await db.Database.MigrateAsync();

        foreach (var role in Roles.All)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }

        if (await userManager.FindByEmailAsync(DefaultAdminEmail) is null)
        {
            var admin = new ApplicationUser
            {
                UserName = DefaultAdminEmail,
                Email = DefaultAdminEmail,
                EmailConfirmed = true,
                DisplayName = "Tickety Admin",
                IsActive = true
            };
            var result = await userManager.CreateAsync(admin, DefaultAdminPassword);
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(admin, Roles.Admin);
                logger.LogInformation("Seeded default admin {Email}", DefaultAdminEmail);
            }
            else
            {
                logger.LogError("Failed to seed admin: {Errors}",
                    string.Join(", ", result.Errors.Select(e => e.Description)));
            }
        }
    }
}
