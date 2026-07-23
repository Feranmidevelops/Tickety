using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Tickety.Domain;
using Tickety.Domain.Entities;
using Tickety.Infrastructure.Identity;

namespace Tickety.Infrastructure.Data;

/// <summary>Applies migrations and seeds the role set, a first Admin, and (on a fresh database)
/// a set of demo users and realistic tickets so the app looks like a live workspace.
/// Runs on every startup; migrations are idempotent and demo data is seeded only once.</summary>
public static class DbSeeder
{
    // Dev-only convenience credentials. In Production the admin comes from
    // Seed:AdminEmail / Seed:AdminPassword — never these known values.
    public const string DefaultAdminEmail = "admin@tickety.local";
    public const string DefaultAdminPassword = "Admin!23456";

    // Shared password for the seeded demo users (agents + requesters). Satisfies the password policy
    // (8+ chars, capital, number, special) so you can sign in as any of them to explore the other roles.
    public const string DemoUserPassword = "Tickety!23";

    public static async Task SeedAsync(IServiceProvider services, bool isDevelopment)
    {
        using var scope = services.CreateScope();
        var sp = scope.ServiceProvider;

        var db = sp.GetRequiredService<AppDbContext>();
        var config = sp.GetRequiredService<IConfiguration>();
        var logger = sp.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(DbSeeder));
        var roleManager = sp.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = sp.GetRequiredService<UserManager<ApplicationUser>>();

        await db.Database.MigrateAsync();

        foreach (var role in Roles.All)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }

        await SeedAdminAsync(userManager, config, logger, isDevelopment);
        await SeedDemoDataAsync(db, userManager, logger);
    }

    private static async Task SeedAdminAsync(
        UserManager<ApplicationUser> userManager, IConfiguration config, ILogger logger, bool isDevelopment)
    {
        // Resolve admin credentials: configured values win; dev falls back to the known defaults;
        // production with nothing configured seeds no admin (so a public deploy has no default login).
        var adminEmail = config["Seed:AdminEmail"];
        var adminPassword = config["Seed:AdminPassword"];
        if (string.IsNullOrWhiteSpace(adminEmail) || string.IsNullOrWhiteSpace(adminPassword))
        {
            if (isDevelopment)
            {
                adminEmail = DefaultAdminEmail;
                adminPassword = DefaultAdminPassword;
            }
            else
            {
                logger.LogWarning(
                    "No Seed:AdminEmail/Seed:AdminPassword configured — skipping admin seed. " +
                    "Set them as environment variables to create the first admin.");
                return;
            }
        }

        if (await userManager.FindByEmailAsync(adminEmail) is null)
        {
            var admin = new ApplicationUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                EmailConfirmed = true,
                DisplayName = "Tickety Admin",
                IsActive = true
            };
            var result = await userManager.CreateAsync(admin, adminPassword);
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(admin, Roles.Admin);
                logger.LogInformation("Seeded admin {Email}", adminEmail);
            }
            else
            {
                logger.LogError("Failed to seed admin: {Errors}",
                    string.Join(", ", result.Errors.Select(e => e.Description)));
            }
        }
    }

    // —— Demo workspace ————————————————————————————————————————————————————————————————
    private record DemoUser(string Email, string Name, string Role);

    private static readonly DemoUser[] DemoAgents =
    {
        new("priya.nair@tickety.local",  "Priya Nair",   Roles.Agent),
        new("marcus.bell@tickety.local", "Marcus Bell",  Roles.Agent),
    };

    private static readonly DemoUser[] DemoRequesters =
    {
        new("aisha.khan@tickety.local",    "Aisha Khan",    Roles.Requester),
        new("tom.reilly@tickety.local",    "Tom Reilly",    Roles.Requester),
        new("lena.fischer@tickety.local",  "Lena Fischer",  Roles.Requester),
        new("david.okoro@tickety.local",   "David Okoro",   Roles.Requester),
        new("sophie.martin@tickety.local", "Sophie Martin", Roles.Requester),
        new("raj.patel@tickety.local",     "Raj Patel",     Roles.Requester),
    };

    // A ticket to seed. Transitions are applied in order after creation; the first InProgress step
    // is done via Accept() (assign + start) using the given agent. New tickets have no transitions.
    private record TicketSpec(
        string Title, string Description, TicketCategory Category, TicketPriority Priority,
        int RequesterIndex, int? AgentIndex, double CreatedHoursAgo, TicketStatus[] Transitions);

    private static readonly TicketStatus[] New = System.Array.Empty<TicketStatus>();
    private static readonly TicketStatus[] Working = { TicketStatus.InProgress };
    private static readonly TicketStatus[] Resolved = { TicketStatus.InProgress, TicketStatus.Resolved };
    private static readonly TicketStatus[] Closed = { TicketStatus.InProgress, TicketStatus.Resolved, TicketStatus.Closed };
    private static readonly TicketStatus[] ClosedFast = { TicketStatus.InProgress, TicketStatus.Closed };
    private static readonly TicketStatus[] Reopened = { TicketStatus.InProgress, TicketStatus.Resolved, TicketStatus.InProgress };

    private static readonly TicketSpec[] DemoTickets =
    {
        new("Laptop won't power on after last night's Windows update",
            "My ThinkPad shuts down at the boot logo and won't start. It updated overnight and hasn't come back on since. I have a client presentation at 2pm and can't access my slides.",
            TicketCategory.Hardware, TicketPriority.Urgent, 0, 0, 6, Working),

        new("VPN keeps disconnecting every few minutes",
            "Working from home today and the VPN drops roughly every 5 minutes, kicking me out of the remote desktop. Reconnecting works but it's constant. Home wifi is otherwise fine.",
            TicketCategory.Network, TicketPriority.High, 1, 1, 20, Working),

        new("Request access to the Finance shared drive",
            "I've moved into the FP&A team and need read/write access to \\\\fileserver\\Finance. My manager Sarah can approve if needed.",
            TicketCategory.AccessRequest, TicketPriority.Medium, 2, null, 3, New),

        new("Outlook not syncing new emails",
            "Outlook shows me as connected but no new mail has come in since this morning. Webmail shows the messages fine, so it's just the desktop client. Already tried Send/Receive.",
            TicketCategory.Software, TicketPriority.Medium, 3, 0, 30, Working),

        new("Second monitor flickering",
            "The external monitor on my desk flickers black every ~30 seconds. Swapped the HDMI cable, no change. Happens on both docked and direct connection.",
            TicketCategory.Hardware, TicketPriority.Low, 4, null, 10, New),

        new("Can't connect to office Wi-Fi on the 5th floor",
            "The 'Corp-Secure' network won't authenticate on the 5th floor meeting rooms — says incorrect password but it's the same everywhere else. 4th floor is fine.",
            TicketCategory.Network, TicketPriority.Medium, 5, 1, 72, Resolved),

        new("Need an Adobe Acrobat Pro licence",
            "I regularly need to edit and combine PDFs for contracts. The free Reader can't do it. Please assign a Pro licence to my account.",
            TicketCategory.Software, TicketPriority.Low, 0, null, 14, New),

        new("3rd floor printer stuck on 'paper jam' with no jam",
            "The big Xerox by the kitchen says paper jam but there's no paper stuck anywhere. Opened every tray and door. Whole floor can't print.",
            TicketCategory.Hardware, TicketPriority.Medium, 1, 0, 44, Working),

        new("Password reset for SAP account",
            "I'm locked out of SAP after too many attempts — it won't take my usual password anymore. Need a reset so I can post today's invoices.",
            TicketCategory.AccessRequest, TicketPriority.High, 2, 1, 96, Resolved),

        new("Zoom audio not working during meetings",
            "In every Zoom call people can't hear me and I can't hear them. Speaker test in Windows works fine. It started after the last Zoom update.",
            TicketCategory.Software, TicketPriority.Medium, 3, 0, 26, Working),

        new("Slow internet across the marketing department",
            "The whole marketing pod is seeing very slow connections since this morning — pages take 20-30s, uploads to the DAM time out. Speed test shows under 2 Mbps on wired.",
            TicketCategory.Network, TicketPriority.High, 4, 1, 16, Working),

        new("New starter laptop setup for Monday",
            "We have a new analyst, Grace, starting Monday. She'll need a laptop imaged with the standard build, Office, and access to the Analytics group. Desk is 4-12.",
            TicketCategory.Hardware, TicketPriority.High, 5, 0, 52, Working),

        new("Excel crashing when opening large files",
            "Excel closes without warning when I open our monthly model (~40MB, lots of formulas). Smaller files are fine. Repaired Office already, no change.",
            TicketCategory.Software, TicketPriority.Medium, 0, 1, 168, Closed),

        new("Request local admin rights to install dev tools",
            "I need to install Docker and the .NET SDK for a project but don't have permission. Can I get temporary local admin, or have them pushed via software centre?",
            TicketCategory.AccessRequest, TicketPriority.Medium, 1, 0, 140, Reopened),

        new("Emails to external clients landing in their spam",
            "Several clients say our emails go straight to their junk folder. It's hurting deliverability on proposals. Can we check SPF/DKIM on the domain?",
            TicketCategory.Network, TicketPriority.High, 2, null, 8, New),

        new("Keyboard keys sticking on my ThinkPad",
            "The E, R and space keys need a hard press and sometimes double-type. Cleaned around them but no better. Might be a hardware fault.",
            TicketCategory.Hardware, TicketPriority.Low, 3, 1, 120, Resolved),

        new("Two-factor codes not arriving",
            "I'm not receiving the SMS 2FA codes to log into the finance portal — waited 10 minutes, tried resend three times. Completely locked out and can't approve payments.",
            TicketCategory.AccessRequest, TicketPriority.Urgent, 4, 0, 4, Working),

        new("Shared mailbox missing after the migration",
            "Since the mailbox migration last weekend, the 'Support' shared mailbox has disappeared from my Outlook. Three of us used it to triage customer emails.",
            TicketCategory.Software, TicketPriority.High, 5, 1, 60, Resolved),

        new("Docking station not charging the laptop",
            "My USB-C dock powers the monitors but no longer charges the laptop — battery drains while docked. Charging direct from the wall adapter works.",
            TicketCategory.Hardware, TicketPriority.Medium, 0, 0, 200, Closed),

        new("Can't access the CRM after my role changed",
            "I moved from Sales to Customer Success last week and now get 'access denied' opening the CRM. I need the CS profile rather than the Sales one.",
            TicketCategory.AccessRequest, TicketPriority.High, 1, 1, 180, ClosedFast),
    };

    private static async Task SeedDemoDataAsync(
        AppDbContext db, UserManager<ApplicationUser> userManager, ILogger logger)
    {
        // Seed the demo workspace only once, keyed on a demo user existing — so leftover test
        // tickets already on the database don't suppress it (and restarts never duplicate it).
        if (await userManager.FindByEmailAsync(DemoAgents[0].Email) is not null)
            return;

        var agents = new List<ApplicationUser>();
        foreach (var d in DemoAgents)
            agents.Add(await EnsureUserAsync(userManager, d));

        var requesters = new List<ApplicationUser>();
        foreach (var d in DemoRequesters)
            requesters.Add(await EnsureUserAsync(userManager, d));

        // If any demo user failed to create (e.g. a password-policy change), bail rather than
        // seed tickets with dangling references.
        if (agents.Contains(null!) || requesters.Contains(null!))
        {
            logger.LogWarning("Skipping ticket seed — one or more demo users could not be created.");
            return;
        }

        // Start the demo queue from a clean slate: drop any leftover test tickets so the workspace
        // looks professional. Safe because this whole block runs only once (see the guard above).
        await db.TicketEvents.ExecuteDeleteAsync();
        await db.Tickets.ExecuteDeleteAsync();

        var now = DateTime.UtcNow;
        var seeded = 0;
        foreach (var spec in DemoTickets)
        {
            var createdAt = now.AddHours(-spec.CreatedHoursAgo);
            var requester = requesters[spec.RequesterIndex];
            var agentId = spec.AgentIndex is int ai ? agents[ai].Id : null;

            var ticket = new Ticket
            {
                Title = spec.Title,
                Description = spec.Description,
                Category = spec.Category,
                Priority = spec.Priority,
                RequesterId = requester.Id,
            };
            ticket.MarkCreated(createdAt);

            // Spread the lifecycle events evenly between creation and now, so timelines look organic.
            for (var j = 0; j < spec.Transitions.Length; j++)
            {
                var at = createdAt.AddHours(spec.CreatedHoursAgo * (j + 1.0) / (spec.Transitions.Length + 1.0));
                var to = spec.Transitions[j];
                if (j == 0 && to == TicketStatus.InProgress && agentId is not null)
                    ticket.Accept(agentId, at);
                else
                    ticket.TransitionTo(to, agentId ?? requester.Id, at);
            }

            db.Tickets.Add(ticket);
            seeded++;
        }

        await db.SaveChangesAsync();
        logger.LogInformation("Seeded {Count} demo tickets and {Users} demo users.",
            seeded, agents.Count + requesters.Count);
    }

    private static async Task<ApplicationUser> EnsureUserAsync(
        UserManager<ApplicationUser> userManager, DemoUser demo)
    {
        var existing = await userManager.FindByEmailAsync(demo.Email);
        if (existing is not null)
            return existing;

        var user = new ApplicationUser
        {
            UserName = demo.Email,
            Email = demo.Email,
            EmailConfirmed = true,
            DisplayName = demo.Name,
            IsActive = true,
        };
        var result = await userManager.CreateAsync(user, DemoUserPassword);
        if (!result.Succeeded)
            return null!;

        await userManager.AddToRoleAsync(user, demo.Role);
        return user;
    }
}
