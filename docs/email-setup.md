# Email setup (Gmail / Google Workspace)

Tickety sends invite emails via SMTP (MailKit). Credentials live in **.NET user-secrets**, never in `appsettings` or git.

## 1. Create a Gmail App Password

Gmail blocks your normal password over SMTP. You need an **App Password**, which requires 2-Step Verification.

1. Turn on **2-Step Verification**: Google Account → **Security** → *2-Step Verification*.
2. Go to **App passwords** (https://myaccount.google.com/apppasswords).
3. Create one (name it "Tickety"). Google shows a 16-character password like `abcd efgh ijkl mnop`.
4. Copy it and **remove the spaces** → `abcdefghijklmnop`.

> Google Workspace: same steps, but your admin may have disabled app passwords. If so, use SendGrid instead (or OAuth2).

## 2. Store the credentials

From `server/Tickety.Api`:

```bash
dotnet user-secrets set "Email:Username" "you@gmail.com"
dotnet user-secrets set "Email:Password" "abcdefghijklmnop"
```

That's all — `Email:FromAddress` defaults to the username, and the rest (host/port/StartTLS/Enabled) is already set in `appsettings.Development.json`:

```json
"Email": { "Enabled": true, "Host": "smtp.gmail.com", "Port": 587, "UseStartTls": true, "FromName": "Tickety" }
```

To turn email off again, set `"Enabled": false` (invites still work — the link is just logged/returned to copy).

## 3. Restart the API and test

```bash
dotnet run --launch-profile http
```

Sign in as admin → **Invite Users** → send one to yourself. You should see **"Invite emailed to …"** and the mail should arrive. The accept link is still shown in the UI as a fallback.

## Troubleshooting

- **Toast says "email not sent"** → check the API console for the error. Usually a wrong/again-needed App Password (`AuthenticationInvalidCredentials`) or 2FA not enabled.
- **Port 587 blocked on your network** → set `"Port": 465, "UseStartTls": false` (the sender auto-negotiates SSL-on-connect for 465).
- **Mail lands in spam** → expected from a personal Gmail; fine for internal/testing. For production use Google Workspace or SendGrid with SPF/DKIM configured.
- **Send limits** → Gmail ~500 recipients/day, Workspace ~2,000/day. Plenty for an internal tool.

## How it's wired (for reference)

- `IEmailSender` + `SmtpEmailSender` (MailKit) live in `Tickety.Infrastructure/Email`. A `NoOpEmailSender` is used when email is disabled/unconfigured, so the app always runs.
- Registered in `Program.cs` via `AddEmailSender(config)` — picks the real sender only when `Enabled` + username + password are all present.
- The invite endpoint (`Endpoints/InviteEndpoints.cs`) sends the mail **best-effort**: a failure is logged and the invite still succeeds. The response's `emailed` flag drives the admin UI message.
- The email body is built in `Tickety.Api/Email/InviteEmail.cs` (swap in your own branding there).
