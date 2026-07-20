namespace Tickety.Api.Email;

/// <summary>Builds the invite email content. Uses table + inline styles for broad email-client support.</summary>
public static class InviteEmail
{
    public static (string Subject, string Html, string Text) Build(string role, string acceptUrl, DateTime expiresAtUtc)
    {
        const string accent = "#5e6ad2";
        var expires = expiresAtUtc.ToString("MMMM d, yyyy 'at' h:mm tt 'UTC'");
        var subject = "You've been invited to Tickety";

        var html = $@"<!doctype html>
<html>
  <body style=""margin:0;padding:0;background:#fbfbfc;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#16171a;"">
    <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background:#fbfbfc;padding:32px 0;"">
      <tr><td align=""center"">
        <table role=""presentation"" width=""440"" cellpadding=""0"" cellspacing=""0"" style=""background:#ffffff;border:1px solid #e2e3e8;border-radius:12px;padding:32px;"">
          <tr><td style=""font-size:18px;font-weight:600;letter-spacing:-0.02em;padding-bottom:8px;"">
            <span style=""color:{accent};"">&#9670;</span> Tickety
          </td></tr>
          <tr><td style=""font-size:15px;line-height:1.55;color:#56585f;padding-bottom:24px;"">
            You've been invited to join <strong style=""color:#16171a;"">Tickety</strong> as a <strong style=""color:#16171a;"">{role}</strong>.
            Click below to set your password and activate your account.
          </td></tr>
          <tr><td style=""padding-bottom:24px;"">
            <a href=""{acceptUrl}"" style=""display:inline-block;background:{accent};color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;padding:10px 20px;border-radius:6px;"">
              Set up my account
            </a>
          </td></tr>
          <tr><td style=""font-size:12px;line-height:1.6;color:#8a8f98;border-top:1px solid #ededf0;padding-top:16px;"">
            This invite expires on {expires}. If the button doesn't work, paste this link into your browser:<br/>
            <a href=""{acceptUrl}"" style=""color:#4f59c4;word-break:break-all;"">{acceptUrl}</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>";

        var text =
            $"You've been invited to join Tickety as a {role}.\n\n" +
            $"Set up your account: {acceptUrl}\n\n" +
            $"This invite expires on {expires}.";

        return (subject, html, text);
    }
}
