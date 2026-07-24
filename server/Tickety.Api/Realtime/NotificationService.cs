using Microsoft.AspNetCore.SignalR;
using Tickety.Api.Contracts;

namespace Tickety.Api.Realtime;

public interface INotificationService
{
    /// <summary>A new ticket entered the queue — push to every agent.</summary>
    Task TicketCreated(TicketSummaryDto ticket);

    /// <summary>A ticket's queue-relevant fields changed (status/assignee) — refresh agent queues.</summary>
    Task TicketUpdatedForQueue(TicketSummaryDto ticket);

    /// <summary>A ticket was assigned to a specific agent — ping just that agent, so a task landing
    /// on them is never a silent arrival even when they're away from the queue.</summary>
    Task TicketAssignedToAgent(string agentId, TicketSummaryDto ticket);

    /// <summary>A ticket changed — push the fresh detail to everyone viewing that ticket.</summary>
    Task TicketChanged(TicketDetailDto ticket);
}

/// <summary>Thin adapter that turns endpoint-side domain changes into SignalR broadcasts.
/// Keeps the hubs themselves logic-free and this behaviour unit-testable.</summary>
public class NotificationService : INotificationService
{
    private readonly IHubContext<QueueHub> _queue;
    private readonly IHubContext<TicketHub> _ticket;

    public NotificationService(IHubContext<QueueHub> queue, IHubContext<TicketHub> ticket)
    {
        _queue = queue;
        _ticket = ticket;
    }

    public Task TicketCreated(TicketSummaryDto ticket) =>
        _queue.Clients.Group(QueueHub.AgentsGroup).SendAsync("TicketCreated", ticket);

    public Task TicketUpdatedForQueue(TicketSummaryDto ticket) =>
        _queue.Clients.Group(QueueHub.AgentsGroup).SendAsync("QueueUpdated", ticket);

    // Targeted at one user's connections via the default user-id (the JWT NameIdentifier claim).
    public Task TicketAssignedToAgent(string agentId, TicketSummaryDto ticket) =>
        _queue.Clients.User(agentId).SendAsync("AssignedToYou", ticket);

    public Task TicketChanged(TicketDetailDto ticket) =>
        _ticket.Clients.Group(TicketHub.GroupFor(ticket.Id)).SendAsync("TicketChanged", ticket);
}
