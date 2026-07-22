using System.Collections.Concurrent;

namespace Tickety.Api.Realtime;

public enum PresenceStatus { Offline, Online, Away }

/// <summary>Tracks which users are currently connected (across tabs) and whether they've gone idle.
/// In-memory singleton — fine for a single API instance.</summary>
public interface IPresenceTracker
{
    /// <summary>Registers a connection. Returns true if the user just came online (first connection).</summary>
    bool Connect(string userId, string connectionId);
    /// <summary>Removes a connection. Returns true if the user is now fully offline.</summary>
    bool Disconnect(string userId, string connectionId);
    /// <summary>Marks a connected user active/idle. Returns true if the effective status changed.</summary>
    bool SetAway(string userId, bool away);
    PresenceStatus StatusOf(string userId);
}

public class PresenceTracker : IPresenceTracker
{
    private sealed class Entry { public readonly HashSet<string> Connections = new(); public bool Away; }

    private readonly ConcurrentDictionary<string, Entry> _users = new();

    public bool Connect(string userId, string connectionId)
    {
        var entry = _users.GetOrAdd(userId, _ => new Entry());
        lock (entry)
        {
            var wasOffline = entry.Connections.Count == 0;
            entry.Connections.Add(connectionId);
            if (wasOffline) entry.Away = false; // reconnecting starts active
            return wasOffline;
        }
    }

    public bool Disconnect(string userId, string connectionId)
    {
        if (!_users.TryGetValue(userId, out var entry)) return false;
        lock (entry)
        {
            entry.Connections.Remove(connectionId);
            if (entry.Connections.Count == 0)
            {
                entry.Away = false;
                _users.TryRemove(userId, out _);
                return true;
            }
            return false;
        }
    }

    public bool SetAway(string userId, bool away)
    {
        if (!_users.TryGetValue(userId, out var entry)) return false;
        lock (entry)
        {
            if (entry.Connections.Count == 0 || entry.Away == away) return false;
            entry.Away = away;
            return true;
        }
    }

    public PresenceStatus StatusOf(string userId)
    {
        if (!_users.TryGetValue(userId, out var entry)) return PresenceStatus.Offline;
        lock (entry)
        {
            if (entry.Connections.Count == 0) return PresenceStatus.Offline;
            return entry.Away ? PresenceStatus.Away : PresenceStatus.Online;
        }
    }
}
