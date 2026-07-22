# Tickety — 4-Day Build-in-Public Series (LinkedIn drafts)

Copy-paste ready. Each post is standalone; together they tell the build story: stack → backend → frontend → real-time.

---

## Day 1 — The stack, and why I chose it

I'm building **Tickety** in public: a scoped-down, real-time support ticketing system. Think "mini Zendesk" — staff raise tickets, agents work them, everyone sees updates live.

Before writing a line, the stack decisions:

**Backend — ASP.NET Core (.NET 10) + SignalR.**
I'm a .NET dev, and the interesting part of this app is real-time updates. SignalR gives me WebSockets with almost no ceremony. Playing to my strengths on the part that has to be rock-solid.

**Database — SQL Server + EF Core.**
Boring on purpose. It's what most .NET shops run, the tooling is excellent, migrations are clean.

**Frontend — React + TypeScript (Vite).**
This one I debated. Blazor would've kept me all-C#. I chose React deliberately: a clean API ↔ SPA split is closer to how these tools are actually built, and it keeps my frontend sharp.

**Auth — invite-only.**
No open signup. An admin adds staff by email; they get a link to set a password. For an internal tool, that's the right model.

The through-line: use the boring, proven stack for the parts that must not break — spend your novelty budget on the one thing that makes the project interesting (here, the real-time layer).

Building the backend next. 👇

#buildinpublic #dotnet #softwareengineering #react

---

## Day 2 — The backend spine (and the bit I'm proud of)

Day 2 of building **Tickety** in public. Backend day.

The piece I care most about: **the ticket lifecycle is a state machine, not a status column you can set to anything.**

`New → In Progress → Resolved → Closed` (plus Reopen). Those transitions live in the domain:

```
ticket.TransitionTo(newStatus)  // throws if the move isn't allowed
```

The UI hides invalid buttons — but the UI is not the guardrail. The server is. I proved it by hitting the API raw and trying to jump a New ticket straight to Closed. It got rejected with a clear 400. That's the difference between a demo and something you'd trust.

The rest of the spine:

• **RBAC** — Requester / Agent / Admin via ASP.NET Identity. Endpoints are role-gated, and list queries are scoped: a requester sees only their own tickets, an agent sees the unassigned queue + their own, an admin sees everything.

• **Invite-only auth** — admin creates an invite token, the invitee sets a password. Closed by default.

• **Audit trail** — every create / assign / status change writes a `TicketEvent`. That powers the activity timeline today, and analytics (avg resolution time, tickets per agent) later.

• **18 unit tests** on the state machine — every valid and invalid transition.

Lesson I keep relearning: put the rules in the domain, not the controller. Frontend up next.

#buildinpublic #dotnet #csharp #cleanarchitecture

---

## Day 3 — Making it look designed, not generated

Day 3 of **Tickety**. Frontend day — and I had one rule: it must not look like a template or "AI slop."

So instead of reaching for a component library, I studied how **Linear and Vercel** actually build interfaces, and turned it into a small design system:

• **One accent color** (indigo). That's it. Everything else is a strict neutral grey scale.
• **Hairline 1px borders instead of drop shadows** for structure. Shadows only for things that truly float (menus, toasts).
• **Tight typography** — 14px UI base, negative letter-spacing on headings, only three font weights.
• Every value is a **CSS custom property** in one `tokens.css`. Light and dark theme is a single-file change.

One product decision I'll defend: **the ticket queue is a table, not cards.** Agents triage by scanning columns — priority, status, assignee, age — down a list. Cards look "modern" but they wreck that vertical scan and waste space. Match the UI to the actual job.

Stack for the client: React + TypeScript, TanStack Query for server state, React Router with role-based route guards.

The takeaway that surprised me: **constraints are what make it look designed.** Few colors. Borders over shadows. A real type scale. Restraint reads as intent.

[attach a screenshot of the queue + ticket detail]

Tomorrow: the actual hard part — real-time.

#buildinpublic #react #typescript #uidesign #frontend

---

## Day 4 — Real-time, and the bug that ate an afternoon

Final day of the **Tickety** build log. The reason the project exists: **live updates.** No refresh button anywhere.

Two SignalR channels do the work:

• **The queue channel** — every agent joins an "agents" group. A requester raises a ticket → the server pushes it → it slides to the top of every agent's queue with a toast. Instantly.

• **The per-ticket channel** — open a ticket and you `JoinTicket(id)`. Now the requester and the agent both watch the status and timeline update in real time as it's worked.

One thing worth knowing: **you can't send a JWT on a WebSocket handshake the normal way.** There's no Authorization header to attach. SignalR's answer is to pass the token as `?access_token=...`, and on the server you lift it into context for hub paths:

```
OnMessageReceived → if path starts with "/hubs", read access_token
```

REST handles commands; the socket handles the push; the client cache gets patched from the pushed payload.

**Then the bug.** My live ticket view kept white-screening: `Cannot read properties of undefined (reading 'map')`. The REST call worked. The socket "worked." But the pushed data was subtly wrong.

Cause: SignalR's default JSON serializer emits **PascalCase with numeric enums**, while my REST API emits **camelCase with string enums**. So the same ticket arrived as `Events` over the socket and `events` over HTTP. The client read `events`, got `undefined`, and crashed on `.map`.

Fix: configure the SignalR JSON protocol to match the HTTP contract — camelCase + string enums — so the same object looks identical no matter which pipe it came through.

I verified the whole thing with a two-browser Playwright test: one window raises a ticket, the other sees it appear and change status live. Green across the board.

Lesson: **when the same data travels over two transports, make them serialize identically — or you'll spend an afternoon debugging ghosts.**

That's Tickety v1: invite-only auth, RBAC, a real lifecycle state machine, and real-time updates over WebSockets. Next up: SLA timers and analytics.

#buildinpublic #dotnet #signalr #react #softwareengineering

---
---

# Round 2 — production polish

A later day of work: taking Tickety from "runs on my machine" toward something deployable and pleasant to use. Four posts.

---

## Moving the database from SQL Server to PostgreSQL — and why

Today I swapped Tickety's database engine. Started on **SQL Server**, moved to **PostgreSQL** (on Supabase). Here's the why, because it wasn't a random preference.

I built on SQL Server because I'm a .NET dev and it's the natural default. But the moment I thought about actually shipping this cheaply, the picture changed:

- Managed SQL Server basically means paying for Azure.
- Almost every free/cheap host (Supabase, Neon, Render, Fly) gives you **managed Postgres** for free.
- And I wanted a **cloud** database anyone could reach — not a local instance living on my laptop.

So: Postgres on Supabase's free tier.

The migration was less scary than expected, thanks to EF Core's provider model:
→ swap `Microsoft.EntityFrameworkCore.SqlServer` → `Npgsql`
→ change one line: `UseSqlServer(...)` → `UseNpgsql(...)`
→ regenerate the migration (the SQL is provider-specific — `nvarchar` became `text`, `datetime2` became `timestamp`)

One real gotcha: Npgsql is strict about `DateTime` and UTC in a way SQL Server isn't, so I had to be explicit about timestamp handling. Then I pointed it at Supabase, let the app run its migrations, and verified logins + ticket writes were persisting to the cloud.

The takeaway: **pick your database around where you'll host, not just what you know** — and a good ORM abstraction turns "change the entire database engine" into a one-file change plus a migration regen.

#buildinpublic #dotnet #efcore #postgres #supabase

---

## Real invite emails — and why "best-effort" matters

Tickety is invite-only: an admin adds staff by email, and they get a link to set a password. Nice in theory — except the email part was faked. The invite link was just logged to the console. For an invite-only app, that means onboarding didn't actually work.

So today I made it send for real (Gmail SMTP via MailKit). Two decisions I'm happy with:

**1. The sender is abstracted.** Everything goes through an `IEmailSender` interface with an SMTP implementation. Switching to SendGrid or a company mail server later is a config change, not a rewrite. Credentials live in secrets, never in the repo.

**2. Sending is best-effort — on purpose.** Creating the invite and sending the email are *not* the same operation. If the mail server hiccups, the invite is still created and the link still works (it's returned/copyable as a fallback). A flaky third-party must never break your core action.

Small detail that trips people up: Gmail won't accept your normal password over SMTP — you need an App Password (with 2FA on). Learned that the fun way.

The takeaway: **when a feature depends on an external service, make that dependency non-fatal.** Wrap it, catch it, and always leave a working fallback path. Your users shouldn't feel someone else's outage.

#buildinpublic #dotnet #email #softwareengineering

---

## Made Tickety actually look like a product

Spent today giving Tickety a proper UI, and there's a debugging lesson in here I won't forget.

I didn't want it to look like a bootstrapped template, so I studied how clean admin dashboards are actually built and turned it into a small design system:

→ a navy sidebar with icons
→ stat cards up top (Total / Open / Resolved / Closed)
→ avatars everywhere, pastel priority pills, colored statuses
→ soft rounded cards on a light canvas
→ light **and** dark themes, all driven by CSS custom properties

Then the bug that taught me something.

I'd been verifying every screen with automated screenshots — they all came out clean and white, exactly like my reference. Shipped it. My tester opens it… and it's **dark**.

Turns out my CSS had `@media (prefers-color-scheme: dark)`, so the app was quietly following each person's OS setting. My screenshot tool defaults to a *light* system preference, so it never showed me the dark path. Their machine was set to dark — so they got a dark app I'd literally never seen.

The fix was small (default to light, make dark an explicit opt-in). The lesson wasn't: **your automated checks can pass while every real user sees something different — if the check doesn't emulate the user's actual environment, it's testing a world that doesn't exist.**

To prove the fix, I re-ran the screenshot with the browser emulating a dark OS — and confirmed it now renders light regardless.

Small thing. Hours of "but it works on my screen." 🙂

#buildinpublic #frontend #react #uidesign #softwareengineering

---

## "Can I see who's online?" — building real-time presence

Today I added presence to Tickety: an admin Users page showing everyone's role and whether they're 🟢 online, 🟡 away, or ⚪ offline — live, no refresh.

Sounds trivial. It isn't. Here's what "who's online" actually involves:

**1. A dedicated connection.** Every signed-in user opens a WebSocket to a `PresenceHub` (SignalR). Connect → online. Disconnect → offline. Easy version done.

**2. Multiple tabs.** If you naively flip a boolean, closing *one* of your three tabs marks you offline while you're still working. So I track a **count of connections per user** — you're only offline when the last one drops.

**3. "Away" isn't something the server knows.** The server sees connected/disconnected, not whether you're actually *at* your desk. So away is detected on the client: 2 minutes of no mouse/keyboard, or switching away from the tab → tell the server "away"; any activity → "online" again.

**4. Only push to who cares.** Presence changes broadcast to a group of admins, so their Users page updates the instant someone logs in — I verified it with two sessions side by side: one showed *Offline*, then flipped to *Online* the moment the other logged in.

The takeaway: "presence" looks like a green dot, but it's really connection-counting + client-side idle detection + targeted real-time fan-out. The green dot is the easy 10%.

Built on .NET + SignalR, and it plugged into the same real-time layer I'm already using for live ticket updates.

#buildinpublic #dotnet #signalr #realtime #softwareengineering
