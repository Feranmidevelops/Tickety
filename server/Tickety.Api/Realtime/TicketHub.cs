using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Tickety.Api.Realtime;

/// <summary>The per-ticket channel. Anyone viewing a ticket joins its group and sees status
/// changes and (later) comments live. Authorization to view the ticket itself is enforced by the
/// REST endpoint that loads it; joining a group only subscribes to change notifications.</summary>
[Authorize]
public class TicketHub : Hub
{
    public static string GroupFor(int ticketId) => $"ticket-{ticketId}";

    public Task JoinTicket(int ticketId) =>
        Groups.AddToGroupAsync(Context.ConnectionId, GroupFor(ticketId));

    public Task LeaveTicket(int ticketId) =>
        Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupFor(ticketId));
}
