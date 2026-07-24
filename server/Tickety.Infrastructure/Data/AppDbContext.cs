using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Tickety.Domain.Entities;
using Tickety.Infrastructure.Identity;

namespace Tickety.Infrastructure.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Ticket> Tickets => Set<Ticket>();
    public DbSet<TicketEvent> TicketEvents => Set<TicketEvent>();
    public DbSet<Invite> Invites => Set<Invite>();
    public DbSet<Notification> Notifications => Set<Notification>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Ticket>(e =>
        {
            e.Property(t => t.Title).HasMaxLength(200).IsRequired();
            e.Property(t => t.Description).HasMaxLength(4000).IsRequired();
            e.Property(t => t.RequesterId).IsRequired();
            e.HasIndex(t => t.Status);
            e.HasIndex(t => t.AssignedAgentId);
            e.HasMany(t => t.Events)
                .WithOne(ev => ev.Ticket)
                .HasForeignKey(ev => ev.TicketId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<TicketEvent>(e =>
        {
            e.Property(ev => ev.ActorId).IsRequired();
            e.Property(ev => ev.Note).HasMaxLength(500);
        });

        builder.Entity<Invite>(e =>
        {
            e.Property(i => i.Email).HasMaxLength(256).IsRequired();
            e.Property(i => i.Role).HasMaxLength(50).IsRequired();
            e.Property(i => i.Token).HasMaxLength(100).IsRequired();
            e.HasIndex(i => i.Token).IsUnique();
        });

        builder.Entity<Notification>(e =>
        {
            e.Property(n => n.UserId).IsRequired();
            e.Property(n => n.Kind).HasMaxLength(50).IsRequired();
            e.Property(n => n.Message).HasMaxLength(500).IsRequired();
            e.HasIndex(n => new { n.UserId, n.CreatedAtUtc });
        });
    }
}
