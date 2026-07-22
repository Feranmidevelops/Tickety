using Tickety.Domain;

namespace Tickety.Api.Contracts;

// —— Auth ——
public record LoginRequest(string Email, string Password);
public record UserDto(string Id, string Email, string DisplayName, string Role);
public record AuthResponse(string Token, DateTime ExpiresAtUtc, UserDto User);

// —— Invites ——
public record CreateInviteRequest(string Email, string Role);
public record InviteCreatedResponse(string Token, string AcceptUrl, string Email, string Role, DateTime ExpiresAtUtc, bool Emailed);
public record InviteInfoResponse(string Email, string Role);
public record AcceptInviteRequest(string DisplayName, string Password);

// —— Tickets ——
public record CreateTicketRequest(string Title, string Description, TicketCategory Category, TicketPriority Priority);
public record ChangeStatusRequest(TicketStatus Status);
public record AssignRequest(string AgentId);

public record TicketSummaryDto(
    int Id,
    string Title,
    TicketCategory Category,
    TicketPriority Priority,
    TicketStatus Status,
    string RequesterId,
    string RequesterName,
    string? AssignedAgentId,
    string? AssignedAgentName,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public record TicketEventDto(
    int Id,
    TicketEventType Type,
    TicketStatus? FromStatus,
    TicketStatus? ToStatus,
    string ActorId,
    string ActorName,
    string? Note,
    DateTime CreatedAtUtc);

public record TicketDetailDto(
    int Id,
    string Title,
    string Description,
    TicketCategory Category,
    TicketPriority Priority,
    TicketStatus Status,
    string RequesterId,
    string RequesterName,
    string? AssignedAgentId,
    string? AssignedAgentName,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc,
    IReadOnlyList<TicketEventDto> Events);

public record AgentDto(string Id, string DisplayName, string Email);

public record UserRow(string Id, string DisplayName, string Email, string Role, bool IsActive, string Presence);
