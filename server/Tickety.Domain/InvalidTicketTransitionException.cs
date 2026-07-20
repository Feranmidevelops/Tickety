namespace Tickety.Domain;

/// <summary>Thrown when a ticket is asked to move to a status the lifecycle does not allow.</summary>
public sealed class InvalidTicketTransitionException : Exception
{
    public TicketStatus From { get; }
    public TicketStatus To { get; }

    public InvalidTicketTransitionException(TicketStatus from, TicketStatus to)
        : base($"Cannot move a ticket from {from} to {to}.")
    {
        From = from;
        To = to;
    }
}
