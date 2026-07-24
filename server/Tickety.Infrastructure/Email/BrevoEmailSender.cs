using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace Tickety.Infrastructure.Email;

/// <summary>Sends email through Brevo's transactional HTTP API (POST /v3/smtp/email). Because it
/// talks HTTPS on port 443 — not SMTP — it works on hosts that block outbound SMTP ports, such as
/// Render's free tier. The sender address must be a verified sender in the Brevo account.</summary>
public class BrevoEmailSender : IEmailSender
{
    private readonly HttpClient _http;
    private readonly EmailOptions _o;
    private readonly ILogger<BrevoEmailSender> _log;

    public BrevoEmailSender(HttpClient http, EmailOptions options, ILogger<BrevoEmailSender> log)
    {
        _http = http;
        _o = options;
        _log = log;
    }

    public bool IsEnabled => true;

    public async Task SendAsync(string toEmail, string subject, string htmlBody, string? textBody = null,
        CancellationToken ct = default)
    {
        var from = string.IsNullOrWhiteSpace(_o.FromAddress) ? _o.Username : _o.FromAddress;

        var payload = new
        {
            sender = new { name = _o.FromName, email = from },
            to = new[] { new { email = toEmail } },
            subject,
            htmlContent = htmlBody,
            textContent = string.IsNullOrWhiteSpace(textBody) ? htmlBody : textBody,
        };

        using var req = new HttpRequestMessage(HttpMethod.Post, "v3/smtp/email");
        req.Headers.Add("api-key", _o.ApiKey);
        req.Headers.Add("accept", "application/json");
        req.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        using var res = await _http.SendAsync(req, ct);
        if (!res.IsSuccessStatusCode)
        {
            var body = await res.Content.ReadAsStringAsync(ct);
            throw new InvalidOperationException($"Brevo API returned {(int)res.StatusCode}: {body}");
        }

        _log.LogInformation("Sent '{Subject}' to {To} via Brevo", subject, toEmail);
    }
}
