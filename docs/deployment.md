# Deploying Tickety

Three pieces, all **free tier, no credit card**: **database → Supabase** (done), **API → Render**, **frontend → Vercel**.

```
Browser ──> Vercel (React static)  ──HTTP/WebSocket──>  Render (.NET API + SignalR)  ──>  Supabase (Postgres)
```

## Prerequisites

- A **Render** account (sign in with GitHub) — the free web-service tier needs no card.
- A **Vercel** account (sign in with GitHub) — Hobby tier, no card.
- Your GitHub repo pushed: `Feranmidevelops/Tickety`.
- Supabase project created + migrated (done). Have your **session-pooler connection string** ready.

---

## Part 1 — Database (Supabase) ✅ already done

Migrations run automatically on API startup, so there's no separate DB step. The deployed API reuses the session-pooler connection string:

```
Host=aws-0-eu-west-1.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.<ref>;Password=<pw>;SSL Mode=Require;Trust Server Certificate=true
```

---

## Part 2 — Deploy the API to Render

The repo has a `render.yaml` blueprint and the app binds to Render's `PORT` automatically.

1. Go to **render.com** → **New → Blueprint**.
2. Connect and pick the **`Feranmidevelops/Tickety`** repo. Render reads `render.yaml` and proposes a free Docker web service `tickety-api` (root `server/`, health check `/health`).
3. It prompts for the `sync:false` env vars — paste these:

| Key | Value |
|---|---|
| `ConnectionStrings__Default` | `Host=aws-0-eu-west-1.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.cjhgmidpcoajhjunpkzw;Password=YOUR_DB_PASSWORD;SSL Mode=Require;Trust Server Certificate=true` |
| `Jwt__Key` | a long random string (32+ chars) |
| `Seed__AdminEmail` | `workwithferanmi@gmail.com` |
| `Seed__AdminPassword` | a strong password (this is your admin login) |
| `Email__Username` | `workwithferanmi@gmail.com` |
| `Email__Password` | your Gmail App Password |

4. **Apply** → Render builds the Docker image and deploys. First build takes a few minutes.
5. Verify: open `https://tickety-api.onrender.com/health` → `{"status":"ok"}`. **Copy that base URL** (Render shows the exact hostname).

> `ClientUrl` is added in Part 4, once the frontend has a URL.

**No blueprint?** You can instead do **New → Web Service** → pick the repo → set *Root Directory* `server`, *Runtime* Docker, *Health Check Path* `/health`, plan **Free**, then add the same env vars.

---

## Part 3 — Deploy the frontend to Vercel

1. **vercel.com** → **Add New → Project** → import **`Feranmidevelops/Tickety`**.
2. **Root Directory → `client`** (the repo root is the whole solution).
3. Framework **Vite** (auto). Add env var **`VITE_API_URL`** = your Render API URL from Part 2.
4. **Deploy** → note the URL, e.g. `https://tickety.vercel.app`.

> `VITE_API_URL` is baked in at build time — change it later ⇒ redeploy. `client/vercel.json` handles SPA routing.

---

## Part 4 — Connect them

In the Render dashboard → your service → **Environment**, set:

```
ClientUrl = https://<your-vercel-url>      (no trailing slash)
```

Save → Render redeploys. CORS + SignalR/presence now accept your Vercel origin, and invite emails link to the live site.

---

## Part 5 — Test with friends

1. Open the Vercel URL → sign in as admin (`Seed__AdminEmail` / `Seed__AdminPassword`).
2. It's invite-only: **Invite Users** → enter each friend's email + role → they get a real email with a set-password link.
3. Raise tickets, work the queue, watch live updates + presence across sessions. Full path: Vercel → Render (HTTP + WebSocket) → Supabase.

---

## Secrets reference (set in Render dashboard)

| Secret | Purpose |
|---|---|
| `ConnectionStrings__Default` | Supabase Postgres connection string |
| `Jwt__Key` | JWT signing key (long random) |
| `Seed__AdminEmail` / `Seed__AdminPassword` | First admin created on startup |
| `Email__Username` / `Email__Password` | Gmail address + App Password |
| `ClientUrl` | Frontend origin (CORS + invite links) |

Non-secret defaults (`Jwt` issuer/audience, `Email` host/port/TLS) live in `appsettings.json`. `ASPNETCORE_ENVIRONMENT` is Production by default, so Swagger is off and the admin comes from `Seed__*`.

## Notes & gotchas

- **Render free tier sleeps after ~15 min idle** → the next request cold-starts (~30–60s for a .NET container). Fine for testing. To avoid it, ping `/health` every ~10 min (e.g. a free cron-job.org job) or upgrade to a paid instance.
- **Supabase free tier pauses after ~7 days idle** — any request wakes it.
- **CORS is single-origin** (whatever `ClientUrl` is). Add a custom domain ⇒ update `ClientUrl`.
- **Rotating a secret:** update it in the Render dashboard → redeploys.
- **Scaling past 1 API instance** would need a SignalR backplane (Redis). Not needed at this size.
- **Redeploys:** both Render and Vercel auto-deploy on every push to `main`.

_A `server/fly.toml` is also included if you ever want to use Fly.io instead (it requires a card)._
