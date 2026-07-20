namespace Tickety.Infrastructure.Email;

/// <summary>SMTP settings bound from the "Email" configuration section.
/// Defaults target Gmail / Google Workspace; the password must come from a secret store.</summary>
public class EmailOptions
{
    /// <summary>When false (or username/password missing) a no-op sender is used and invite
    /// links are only logged — so the app runs fine without mail credentials.</summary>
    public bool Enabled { get; set; }

    public string Host { get; set; } = "smtp.gmail.com";
    public int Port { get; set; } = 587;
    public bool UseStartTls { get; set; } = true;

    /// <summary>Full Gmail/Workspace address used to authenticate (e.g. you@gmail.com).</summary>
    public string Username { get; set; } = "";

    /// <summary>Gmail App Password (16 chars) — NOT your normal account password.</summary>
    public string Password { get; set; } = "";

    /// <summary>From address shown to recipients. Defaults to <see cref="Username"/> if blank.
    /// Gmail requires this to be the authenticated account or one of its verified aliases.</summary>
    public string FromAddress { get; set; } = "";
    public string FromName { get; set; } = "Tickety";
}
