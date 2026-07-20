using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using MimeKit;

namespace Tickety.Infrastructure.Email;

/// <summary>SMTP sender built on MailKit. Works with any SMTP provider; configured for Gmail by default.</summary>
public class SmtpEmailSender : IEmailSender
{
    private readonly EmailOptions _o;
    private readonly ILogger<SmtpEmailSender> _log;

    public SmtpEmailSender(EmailOptions options, ILogger<SmtpEmailSender> log)
    {
        _o = options;
        _log = log;
    }

    public bool IsEnabled => true;

    public async Task SendAsync(string toEmail, string subject, string htmlBody, string? textBody = null,
        CancellationToken ct = default)
    {
        var from = string.IsNullOrWhiteSpace(_o.FromAddress) ? _o.Username : _o.FromAddress;

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_o.FromName, from));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = subject;
        message.Body = new BodyBuilder { HtmlBody = htmlBody, TextBody = textBody }.ToMessageBody();

        using var client = new SmtpClient();
        var security = _o.UseStartTls ? SecureSocketOptions.StartTls : SecureSocketOptions.Auto;
        await client.ConnectAsync(_o.Host, _o.Port, security, ct);
        await client.AuthenticateAsync(_o.Username, _o.Password, ct);
        await client.SendAsync(message, ct);
        await client.DisconnectAsync(true, ct);

        _log.LogInformation("Sent '{Subject}' to {To}", subject, toEmail);
    }
}

/// <summary>Used when email is disabled or unconfigured — the invite link is still logged
/// by the endpoint, so the app is fully usable without SMTP credentials.</summary>
public class NoOpEmailSender : IEmailSender
{
    private readonly ILogger<NoOpEmailSender> _log;
    public NoOpEmailSender(ILogger<NoOpEmailSender> log) => _log = log;

    public bool IsEnabled => false;

    public Task SendAsync(string toEmail, string subject, string htmlBody, string? textBody = null,
        CancellationToken ct = default)
    {
        _log.LogWarning("Email disabled — skipped sending '{Subject}' to {To}. Set Email:Enabled=true to send.",
            subject, toEmail);
        return Task.CompletedTask;
    }
}
