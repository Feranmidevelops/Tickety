namespace Tickety.Domain.Entities;

/// <summary>A personal notification for one user (e.g. "a ticket was assigned to you"). Persisted
/// so it survives a page refresh and is waiting in the bell even if the user was offline when it
/// happened — unlike a live SignalR push, which only reaches connected clients.</summary>
public class Notification
{
    public int Id { get; set; }

    /// <summary>Recipient user id.</summary>
    public string UserId { get; set; } = null!;

    /// <summary>Kind of notification, e.g. "assigned".</summary>
    public string Kind { get; set; } = null!;

    public string Message { get; set; } = null!;
    public int TicketId { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime? ReadAtUtc { get; set; }
}
