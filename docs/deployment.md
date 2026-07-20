# Deploying Tickety

Three pieces: **database → Supabase** (done), **API → Fly.io**, **frontend → Vercel**. All free-tier friendly.

```
Browser ──> Vercel (React static)  ──HTTP/WebSocket──>  Fly.io (.NET API + SignalR)  ──>  Supabase (Postgres)
```

## Prerequisites

- A **Fly.io** account + the `flyctl` CLI — install: https://fly.io/docs/flyctl/install/ (Fly requires a card on file, but small apps stay within a few dollars/month; often ~free).
- A **Vercel** account (sign in with GitHub).
- Your GitHub repo already pushed: `Feranmidevelops/Tickety`.
- Supabase project already created and migrated (done). Have your **session-pooler connection string** handy.

---

## Part 1 — Database (Supabase) ✅ already done

The schema is migrated and the app talks to it. For the deployed API you'll reuse the **session pooler** connection string:

```
Host=aws-0-eu-west-1.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.<ref>;Password=<pw>;SSL Mode=Require;Trust Server Certificate=true
```

Migrations run automatically on API startup, so there's no separate DB step when deploying.

---

## Part 2 — Deploy the API to Fly.io

All commands run from the **`server/`** directory (where the `Dockerfile` lives).

**1. Log in and create the app (don't deploy yet):**
```bash
cd server
fly auth login
fly launch --no-deploy
```
Answer the prompts:
- App name: e.g. `tickety-api` (must be globally unique — try `tickety-api-feranmi`).
- Region: pick one near Supabase's `eu-west-1` → **`lhr`** (London).
- It detects the `Dockerfile` and generates `fly.toml`. Confirm **internal_port = 8080** in that file (it's what the container listens on).

**2. Set the production secrets** (these become environment variables; `__` maps to `:` in .NET config). Quote each value:

```bash
# Database (your Supabase session-pooler string, with the real password)
fly secrets set "ConnectionStrings__Default=Host=aws-0-eu-west-1.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.cjhgmidpcoajhjunpkzw;Password=YOUR_DB_PASSWORD;SSL Mode=Require;Trust Server Certificate=true"

# JWT signing key — generate a strong one:
#   macOS/Linux/Git-Bash:  openssl rand -base64 48
#   PowerShell:            [Convert]::ToBase64String((1..48|%{Get-Random -Max 256}))
fly secrets set "Jwt__Key=PASTE_A_LONG_RANDOM_STRING_HERE"

# First admin (no default admin is created in production)
fly secrets set "Seed__AdminEmail=you@yourdomain.com" "Seed__AdminPassword=A-Strong-Password-123!"

# Gmail SMTP for invite emails
fly secrets set "Email__Username=workwithferanmi@gmail.com" "Email__Password=your16charapppassword"
```

> `ClientUrl` comes later (Part 4) once the frontend has a URL.

**3. Deploy:**
```bash
fly deploy
```

**4. Verify:**
```bash
fly open            # opens https://<app>.fly.dev
curl https://<app>.fly.dev/health     # -> {"status":"ok"}
```
Check the logs for the admin seed and DB migration: `fly logs`. Note your API URL — you'll need it next.

---

## Part 3 — Deploy the frontend to Vercel

Easiest via the dashboard (auto-deploys on every push):

1. Go to https://vercel.com → **Add New… → Project** → import **`Feranmidevelops/Tickety`**.
2. **Root Directory:** set to **`client`** (important — the repo root is the whole solution).
3. Framework preset: **Vite** (auto-detected). Build command `npm run build`, output `dist` (defaults are fine).
4. **Environment Variables** → add:
   - `VITE_API_URL` = `https://<your-fly-app>.fly.dev`  ← your API URL from Part 2
5. **Deploy.** Note the resulting URL, e.g. `https://tickety.vercel.app`.

> `VITE_API_URL` is baked in at build time. If the API URL ever changes, update the env var and redeploy.
> The included `client/vercel.json` adds the SPA rewrite so deep links like `/queue` don't 404.

---

## Part 4 — Connect them

Tell the API its real frontend origin (drives CORS **and** the invite-link URLs):

```bash
fly secrets set "ClientUrl=https://tickety.vercel.app"     # your Vercel URL, no trailing slash
```
This restarts the API. CORS now allows the Vercel origin and invite emails link to the live site.

---

## Part 5 — Smoke test (production)

1. Open your Vercel URL → sign in with the `Seed__AdminEmail` / `Seed__AdminPassword` you set.
2. **Invite Users** → invite yourself as an `Agent` → the email should arrive with a live accept link.
3. Open two browsers (admin + the new agent/requester) and raise a ticket — confirm it appears live in the queue with a toast, and status changes stream on the ticket page. That exercises the full path: Vercel → Fly (HTTP + WebSocket) → Supabase.

---

## Secrets reference (set on Fly)

| Secret | Purpose |
|---|---|
| `ConnectionStrings__Default` | Supabase Postgres connection string |
| `Jwt__Key` | JWT signing key (long random) |
| `Seed__AdminEmail` / `Seed__AdminPassword` | First admin created on startup |
| `Email__Username` / `Email__Password` | Gmail address + App Password |
| `ClientUrl` | Frontend origin (CORS + invite links) |

Non-secret defaults (`Jwt` issuer/audience, `Email` host/port/TLS) live in `appsettings.json`. `ASPNETCORE_ENVIRONMENT` defaults to **Production** on Fly, so Swagger is off and the admin comes from `Seed__*`.

## Notes & gotchas

- **Supabase free tier pauses after ~7 days of inactivity** — the first request after that wakes it (a few seconds). Any hit to the API resumes it.
- **Fly cold starts:** by default a machine may auto-stop when idle and cold-start on the next request (~1–2s). For a demo with zero cold start, set `min_machines_running = 1` under `[http_service]` in `fly.toml` (uses a bit more of the allowance).
- **CORS is single-origin** (whatever `ClientUrl` is). Add a custom domain? Update `ClientUrl`.
- **Rotating a secret:** just run `fly secrets set …` again — it redeploys.
- **Scaling past 1 API instance** would need a SignalR backplane (Azure SignalR Service or Redis). Not needed at this size.
- **Redeploys:** API → `fly deploy` from `server/`. Frontend → push to GitHub (Vercel auto-builds) or `vercel --prod`.
