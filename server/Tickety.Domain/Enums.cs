namespace Tickety.Domain;

public enum TicketStatus
{
    New = 0,
    InProgress = 1,
    Resolved = 2,
    Closed = 3
}

public enum TicketCategory
{
    Hardware = 0,
    Network = 1,
    Software = 2,
    AccessRequest = 3
}

public enum TicketPriority
{
    Low = 0,
    Medium = 1,
    High = 2,
    Urgent = 3
}

public enum TicketEventType
{
    Created = 0,
    StatusChanged = 1,
    Assigned = 2,
    Reopened = 3
}

/// <summary>Canonical role names used across Identity and authorization policies.</summary>
public static class Roles
{
    public const string Requester = "Requester";
    public const string Agent = "Agent";
    public const string Admin = "Admin";

    public static readonly string[] All = { Requester, Agent, Admin };
}
