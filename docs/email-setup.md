# Email setup

Tickety sends invite emails through a pluggable `IEmailSender`. Pick a provider with `Email:Provider`:

| Provider | Transport | Use it for |
|----------|-----------|------------|
| `Smtp`   | SMTP (MailKit) | Local development (Gmail App Password) |
| `Brevo`  | HTTPS API (port 443) | Production on Render's free tier |

> **Why two?** Render's free tier **blocks all outbound SMTP** (ports 25/465/587) — so Gmail-over-SMTP can never connect from a free service (the connection just times out). Brevo sends over HTTPS, which isn't blocked, and stays free. See Render's changelog: *"Free web services will no longer allow outbound traffic to SMTP ports."*

Credentials live in **.NET user-secrets** (local) or **platform env vars** (prod) — never in `appsettings` or git.

---

## Production: Brevo (HTTP API, free, no credit card)

1. **Sign up** at [brevo.com](https://www.brevo.com) (free plan: 300 emails/day, no card).
2. **Verify a sender**: *Settings → Senders, Domains & Dedicated IPs → Senders → Add a sender*. Use `workwithferanmi@gmail.com` (name `Tickety`). Brevo emails that address a confirmation link — click it. You can only send **from** a verified sender.
3. **Create an API key**: *Settings → SMTP & API → API Keys → Generate a new API key* (v3). It looks like `xkeysib-…`.
4. **Set the env vars** on Render (*tickety-api → Environment*):

   ```
   Email__Provider = Brevo
   Email__ApiKey   = xkeysib-...        (the key from step 3)
   Email__Username = workwithferanmi@gmail.com   (used as the From address; must match the verified sender)
   ```

   `Email__Password` is unused by Brevo — leave it or delete it. `Email__Enabled` is already `true` in `appsettings.json`.
5. **Save** → Render redeploys. Send yourself an invite; the toast should read *"Invite emailed to …"*.

> **Deliverability:** sending *from* a `gmail.com` address via Brevo works for testing but may land in spam (Brevo can't DKIM-sign for gmail.com). For clean delivery later, verify a domain you own in Brevo and send from `noreply@yourdomain`.

---

## Local development: Gmail SMTP

SMTP isn't blocked on your own machine, so Gmail works locally.

1. **Create a Gmail App Password** (requires 2-Step Verification): [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) → name it "Tickety" → copy the 16 chars and **remove the spaces**.
2. **Store the credentials** from `server/Tickety.Api`:

   ```bash
   dotnet user-secrets set "Email:Username" "you@gmail.com"
   dotnet user-secrets set "Email:Password" "abcdefghijklmnop"
   ```

   `Email:Provider` defaults to `Smtp`, and host/port/StartTLS/FromName are already in `appsettings.json`. To turn email off, set `"Email:Enabled": false` (invites still work — the accept link is logged and returned to copy).
3. **Run and test**: `dotnet run --launch-profile http` → sign in as admin → **Invite Users** → send one to yourself.

---

## The invite always works, even without email

Sending is **best-effort**. If email is off or fails, the invite is still created and its accept link is logged and returned in the API response — the admin UI shows it to copy/paste. Email never blocks onboarding.

## Troubleshooting

- **Brevo 401 `Key not found`** → the API key is wrong or was revoked; regenerate it.
- **Brevo 400 `sender not valid`** → the From address (`Email__Username`) isn't a verified sender in Brevo. Verify it (step 2).
- **SMTP hangs ~120s then "email not sent" on Render** → that's the SMTP-port block. Switch `Email__Provider` to `Brevo`.
- **Mail lands in spam** → expected from a gmail.com sender; fine for testing. Use a verified domain for production.

## How it's wired (for reference)

- `IEmailSender` with `SmtpEmailSender` (MailKit) and `BrevoEmailSender` (HTTPS) in `Tickety.Infrastructure/Email`. `NoOpEmailSender` is used when email is disabled/unconfigured, so the app always runs.
- `AddEmailSender(config)` in `Program.cs` picks the sender from `Email:Provider` + whether that provider's credentials are present.
- The invite endpoint (`Endpoints/InviteEndpoints.cs`) sends **best-effort**; the response's `emailed` flag drives the admin UI message. The email body is built in `Tickety.Api/Email/InviteEmail.cs`.
