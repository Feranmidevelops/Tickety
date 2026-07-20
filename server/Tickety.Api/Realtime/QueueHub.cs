using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Tickety.Domain;

namespace Tickety.Api.Realtime;

/// <summary>The shared agent queue channel. Every connected agent/admin joins the "agents" group
/// and receives live pushes when tickets are created, assigned, or updated.</summary>
[Authorize(Roles = $"{Roles.Agent},{Roles.Admin}")]
public class QueueHub : Hub
{
    public const string AgentsGroup = "agents";

    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, AgentsGroup);
        await base.OnConnectedAsync();
    }
}
