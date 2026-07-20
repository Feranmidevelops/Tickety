using Tickety.Domain;
using Tickety.Domain.Entities;

namespace Tickety.Api.Contracts;

/// <summary>Maps ticket entities to DTOs, resolving user ids to display names via a supplied lookup.</summary>
public static class TicketMapping
{
    private static string NameOf(this IReadOnlyDictionary<string, string> names, string? id) =>
        id is not null && names.TryGetValue(id, out var n) ? n : (id ?? "—");

    public static TicketSummaryDto ToSummary(this Ticket t, IReadOnlyDictionary<string, string> names) => new(
        t.Id, t.Title, t.Category, t.Priority, t.Status,
        t.RequesterId, names.NameOf(t.RequesterId),
        t.AssignedAgentId, t.AssignedAgentId is null ? null : names.NameOf(t.AssignedAgentId),
        t.CreatedAtUtc, t.UpdatedAtUtc);

    public static TicketDetailDto ToDetail(this Ticket t, IReadOnlyDictionary<string, string> names) => new(
        t.Id, t.Title, t.Description, t.Category, t.Priority, t.Status,
        t.RequesterId, names.NameOf(t.RequesterId),
        t.AssignedAgentId, t.AssignedAgentId is null ? null : names.NameOf(t.AssignedAgentId),
        t.CreatedAtUtc, t.UpdatedAtUtc,
        t.Events.OrderBy(e => e.CreatedAtUtc).Select(e => e.ToDto(names)).ToList());

    public static TicketEventDto ToDto(this TicketEvent e, IReadOnlyDictionary<string, string> names)
    {
        // Assigned events store the target agent id in the note — resolve it to a display name.
        var note = e.Type == TicketEventType.Assigned && e.Note is not null
            ? names.NameOf(e.Note)
            : e.Note;
        return new(e.Id, e.Type, e.FromStatus, e.ToStatus, e.ActorId, names.NameOf(e.ActorId), note, e.CreatedAtUtc);
    }
}
