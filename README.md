# Tickety

A scoped-down, real-time IT support ticketing system — a "mini Zendesk" with invite-only auth, role-based access, a proper ticket lifecycle state machine, and live updates over WebSockets.

**Stack:** ASP.NET Core (.NET 10) Web API + SignalR · PostgreSQL via EF Core (hosted on Supabase) · React + TypeScript (Vite).

## Features (Phase 1)

- **Invite-only sign-up** — an admin invites staff by email; they open a link to set a password. No open registration.
- **RBAC** — `Requester` (raise/track own tickets), `Agent` (queue, accept/assign, change status), `Admin` (everything + user invites).
- **Ticket lifecycle** — `New → In Progress → Resolved → Closed`, with **Reopen**. Transitions are enforced by a domain state machine (`Ticket.TransitionTo`), not just the UI — invalid moves are rejected server-side.
- **Real-time** over two SignalR channels:
  - **Queue hub** — every agent sees new tickets appear live, with a toast.
  - **Ticket hub** — anyone viewing a ticket sees status changes and the activity timeline update live.
- **Audit timeline** — every create/assign/status-change is recorded as a `TicketEvent` (powers the timeline now, analytics later).

## Architecture

```
/server                     ASP.NET Core solution
  Tickety.Domain            Entities, enums, lifecycle state machine (no infra deps)
  Tickety.Infrastructure    EF Core DbContext, Identity, seeder
  Tickety.Api               Minimal-API endpoints, SignalR hubs, JWT auth
  Tickety.Tests             xUnit tests for the state machine
/client                     React + TS (Vite) SPA
  src/lib                   typed API client + helpers
  src/auth                  auth context + route guards
  src/realtime              SignalR hooks
  src/components, src/pages UI (design tokens in src/styles)
```

REST handles commands/queries; SignalR pushes changes. The JWT is sent to hubs via the `access_token` query param on the WebSocket handshake. Both the HTTP API and the SignalR JSON protocol use camelCase + string enums so pushed payloads match REST responses exactly.

## Running locally

**Prerequisites:** .NET 10 SDK, Node 20+, and a PostgreSQL database (a free [Supabase](https://supabase.com) project works well).

### API

Provide the connection string (and optionally Gmail SMTP for invite emails) via user-secrets — never commit them:

```bash
cd server/Tickety.Api
dotnet user-secrets set "ConnectionStrings:Default" "Host=<host>;Port=5432;Database=postgres;Username=<user>;Password=<pw>;SSL Mode=Require;Trust Server Certificate=true"
dotnet run --launch-profile http        # http://localhost:5003
```

The database is migrated automatically on startup. In Development a default admin is seeded:

- **Email:** `admin@tickety.local`
- **Password:** `Admin!23456`

(In Production no default admin is created — set `Seed__AdminEmail` / `Seed__AdminPassword` env vars instead.)

### Client

```bash
cd client
npm install
npm run dev                              # http://localhost:5280
```

Sign in as the seeded admin, invite a `Requester` and an `Agent` from **Invite Users**, open each invite link (also logged to the API console) to set a password, then try raising and working tickets across two browsers to see the live updates.

## Tests

```bash
cd server
dotnet test                              # state-machine unit tests
```

## Design

The UI follows a Linear/Vercel-inspired minimalist neutral system (single indigo accent, hairline borders over shadows, tight type). Tokens live in [client/src/styles/tokens.css](client/src/styles/tokens.css); the full spec is in [design-system.md](design-system.md). Light + dark themes are token-driven.

## Deployment

Deploy guide (API on Fly.io, frontend on Vercel, database on Supabase): [docs/deployment.md](docs/deployment.md).
Production configuration (connection string, JWT key, `ClientUrl`, admin seed, SMTP) is supplied via environment variables / platform secrets — see the guide.

## Roadmap (Phase 2+)

- SLA timers per category/priority with countdown + breach highlighting
- Comment threads (public replies vs internal notes)
- Analytics: avg resolution time, tickets per agent / category
- Offline-requester email notifications (invite emails already ship via Gmail SMTP)
