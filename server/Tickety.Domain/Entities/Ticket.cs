namespace Tickety.Domain.Entities;

public class Ticket
{
    public int Id { get; set; }

    public string Title { get; set; } = null!;
    public string Description { get; set; } = null!;
    public TicketCategory Category { get; set; }
    public TicketPriority Priority { get; set; }
    public TicketStatus Status { get; private set; } = TicketStatus.New;

    /// <summary>Id of the user who raised the ticket.</summary>
    public string RequesterId { get; set; } = null!;

    /// <summary>Id of the agent the ticket is assigned to, if any.</summary>
    public string? AssignedAgentId { get; private set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public List<TicketEvent> Events { get; set; } = new();

    /// <summary>Allowed forward transitions. Reopen (Resolved/Closed -> InProgress) is
    /// modelled as a normal transition here and flagged separately via <see cref="IsReopen"/>.</summary>
    private static readonly IReadOnlyDictionary<TicketStatus, TicketStatus[]> Allowed =
        new Dictionary<TicketStatus, TicketStatus[]>
        {
            [TicketStatus.New] = new[] { TicketStatus.InProgress },
            [TicketStatus.InProgress] = new[] { TicketStatus.Resolved, TicketStatus.Closed },
            [TicketStatus.Resolved] = new[] { TicketStatus.Closed, TicketStatus.InProgress },
            [TicketStatus.Closed] = new[] { TicketStatus.InProgress }
        };

    public static bool CanTransition(TicketStatus from, TicketStatus to) =>
        Allowed.TryGetValue(from, out var targets) && Array.IndexOf(targets, to) >= 0;

    public static bool IsReopen(TicketStatus from, TicketStatus to) =>
        (from == TicketStatus.Resolved || from == TicketStatus.Closed) && to == TicketStatus.InProgress;

    /// <summary>Moves the ticket to <paramref name="to"/> if the lifecycle permits it, appends the
    /// matching audit event, and returns that event. Throws if the transition is not allowed.</summary>
    public TicketEvent TransitionTo(TicketStatus to, string actorId, DateTime nowUtc)
    {
        if (!CanTransition(Status, to))
            throw new InvalidTicketTransitionException(Status, to);

        var from = Status;
        var reopen = IsReopen(from, to);
        Status = to;
        UpdatedAtUtc = nowUtc;

        return AddEvent(reopen ? TicketEventType.Reopened : TicketEventType.StatusChanged, actorId, nowUtc, from, to);
    }

    /// <summary>Agent claims an unassigned/New ticket: assigns to self and starts progress.</summary>
    public IReadOnlyList<TicketEvent> Accept(string agentId, DateTime nowUtc)
    {
        var assignEvent = Assign(agentId, agentId, nowUtc);
        var statusEvent = TransitionTo(TicketStatus.InProgress, agentId, nowUtc);
        return new[] { assignEvent, statusEvent };
    }

    /// <summary>Assigns (or reassigns) the ticket to an agent and appends an audit event.
    /// The target agent id is stored raw in the note; the API resolves it to a display name.</summary>
    public TicketEvent Assign(string agentId, string actorId, DateTime nowUtc)
    {
        AssignedAgentId = agentId;
        UpdatedAtUtc = nowUtc;
        return AddEvent(TicketEventType.Assigned, actorId, nowUtc, note: agentId);
    }

    /// <summary>Records ticket creation. Call once, right after construction.</summary>
    public TicketEvent MarkCreated(DateTime nowUtc)
    {
        CreatedAtUtc = nowUtc;
        UpdatedAtUtc = nowUtc;
        return AddEvent(TicketEventType.Created, RequesterId, nowUtc, toStatus: TicketStatus.New);
    }

    private TicketEvent AddEvent(TicketEventType type, string actorId, DateTime nowUtc,
        TicketStatus? fromStatus = null, TicketStatus? toStatus = null, string? note = null)
    {
        var ev = new TicketEvent
        {
            Type = type,
            ActorId = actorId,
            FromStatus = fromStatus,
            ToStatus = toStatus,
            Note = note,
            CreatedAtUtc = nowUtc
        };
        Events.Add(ev);
        return ev;
    }
}
