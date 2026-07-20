namespace Tickety.Infrastructure.Email;

/// <summary>Sends transactional email. Provider-agnostic so the invite flow (and later
/// status notifications) don't care whether it's Gmail SMTP, SendGrid, etc.</summary>
public interface IEmailSender
{
    /// <summary>True when a real SMTP sender is configured; false for the no-op fallback.</summary>
    bool IsEnabled { get; }

    Task SendAsync(string toEmail, string subject, string htmlBody, string? textBody = null,
        CancellationToken ct = default);
}
