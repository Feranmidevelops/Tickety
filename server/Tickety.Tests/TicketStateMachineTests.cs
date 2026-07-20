using Tickety.Domain;
using Tickety.Domain.Entities;
using Xunit;

namespace Tickety.Tests;

public class TicketStateMachineTests
{
    private static readonly DateTime Now = new(2026, 7, 20, 12, 0, 0, DateTimeKind.Utc);

    private static Ticket NewTicket()
    {
        var t = new Ticket { Title = "T", Description = "D", RequesterId = "req" };
        t.MarkCreated(Now);
        return t;
    }

    [Theory]
    [InlineData(TicketStatus.New, TicketStatus.InProgress, true)]
    [InlineData(TicketStatus.InProgress, TicketStatus.Resolved, true)]
    [InlineData(TicketStatus.InProgress, TicketStatus.Closed, true)]
    [InlineData(TicketStatus.Resolved, TicketStatus.Closed, true)]
    [InlineData(TicketStatus.Resolved, TicketStatus.InProgress, true)]   // reopen
    [InlineData(TicketStatus.Closed, TicketStatus.InProgress, true)]     // reopen
    [InlineData(TicketStatus.New, TicketStatus.Resolved, false)]
    [InlineData(TicketStatus.New, TicketStatus.Closed, false)]
    [InlineData(TicketStatus.New, TicketStatus.New, false)]
    [InlineData(TicketStatus.InProgress, TicketStatus.New, false)]
    [InlineData(TicketStatus.Resolved, TicketStatus.New, false)]
    [InlineData(TicketStatus.Closed, TicketStatus.Resolved, false)]
    [InlineData(TicketStatus.Closed, TicketStatus.Closed, false)]
    public void CanTransition_matches_lifecycle(TicketStatus from, TicketStatus to, bool expected)
        => Assert.Equal(expected, Ticket.CanTransition(from, to));

    [Fact]
    public void MarkCreated_starts_New_with_a_Created_event()
    {
        var t = NewTicket();
        Assert.Equal(TicketStatus.New, t.Status);
        Assert.Single(t.Events);
        Assert.Equal(TicketEventType.Created, t.Events[0].Type);
    }

    [Fact]
    public void Accept_assigns_self_and_moves_to_InProgress()
    {
        var t = NewTicket();
        t.Accept("agent-1", Now);

        Assert.Equal(TicketStatus.InProgress, t.Status);
        Assert.Equal("agent-1", t.AssignedAgentId);
        Assert.Contains(t.Events, e => e.Type == TicketEventType.Assigned);
        Assert.Contains(t.Events, e => e.Type == TicketEventType.StatusChanged && e.ToStatus == TicketStatus.InProgress);
    }

    [Fact]
    public void Full_happy_path_New_to_Closed()
    {
        var t = NewTicket();
        t.Accept("agent-1", Now);
        t.TransitionTo(TicketStatus.Resolved, "agent-1", Now);
        t.TransitionTo(TicketStatus.Closed, "agent-1", Now);
        Assert.Equal(TicketStatus.Closed, t.Status);
    }

    [Fact]
    public void Reopen_from_Resolved_logs_a_Reopened_event()
    {
        var t = NewTicket();
        t.Accept("agent-1", Now);
        t.TransitionTo(TicketStatus.Resolved, "agent-1", Now);

        var ev = t.TransitionTo(TicketStatus.InProgress, "agent-1", Now);

        Assert.Equal(TicketStatus.InProgress, t.Status);
        Assert.Equal(TicketEventType.Reopened, ev.Type);
    }

    [Fact]
    public void Invalid_transition_throws_and_leaves_status_unchanged()
    {
        var t = NewTicket();
        var ex = Assert.Throws<InvalidTicketTransitionException>(
            () => t.TransitionTo(TicketStatus.Closed, "agent-1", Now));

        Assert.Equal(TicketStatus.New, t.Status);
        Assert.Equal(TicketStatus.New, ex.From);
        Assert.Equal(TicketStatus.Closed, ex.To);
    }
}
