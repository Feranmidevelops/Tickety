namespace Tickety.Domain.Entities;

/// <summary>An immutable audit entry describing something that happened to a ticket.
/// Powers the per-ticket timeline today and analytics later.</summary>
public class TicketEvent
{
    public int Id { get; set; }
    public int TicketId { get; set; }
    public Ticket Ticket { get; set; } = null!;

    public TicketEventType Type { get; set; }
    public TicketStatus? FromStatus { get; set; }
    public TicketStatus? ToStatus { get; set; }

    /// <summary>Id of the user who caused the event.</summary>
    public string ActorId { get; set; } = null!;

    /// <summary>Optional human-readable detail (e.g. "assigned to Jane").</summary>
    public string? Note { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}
