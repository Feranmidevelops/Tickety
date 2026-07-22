using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Tickety.Domain;

namespace Tickety.Api.Realtime;

/// <summary>Every signed-in client connects here so we can track online/away/offline presence.
/// Admins additionally join a group that receives live presence changes for the Users page.</summary>
[Authorize]
public class PresenceHub : Hub
{
    public const string AdminsGroup = "presence-admins";
    private readonly IPresenceTracker _tracker;

    public PresenceHub(IPresenceTracker tracker) => _tracker = tracker;

    private string Uid => Context.User?.FindFirstValue(ClaimTypes.NameIdentifier) ?? Context.UserIdentifier!;

    public override async Task OnConnectedAsync()
    {
        var uid = Uid;
        var newlyOnline = _tracker.Connect(uid, Context.ConnectionId);

        if (Context.User?.IsInRole(Roles.Admin) == true || Context.User?.IsInRole(Roles.Agent) == true)
            await Groups.AddToGroupAsync(Context.ConnectionId, AdminsGroup);

        if (newlyOnline) await Broadcast(uid);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var uid = Uid;
        if (_tracker.Disconnect(uid, Context.ConnectionId)) await Broadcast(uid);
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>Called by the client's idle detector: "away" when idle, "online" when active again.</summary>
    public async Task SetStatus(string status)
    {
        var uid = Uid;
        if (_tracker.SetAway(uid, string.Equals(status, "away", StringComparison.OrdinalIgnoreCase)))
            await Broadcast(uid);
    }

    private Task Broadcast(string userId) =>
        Clients.Group(AdminsGroup).SendAsync("PresenceChanged", new
        {
            userId,
            status = _tracker.StatusOf(userId).ToString(),
        });
}
