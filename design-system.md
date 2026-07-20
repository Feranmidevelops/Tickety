# Tickety — Design System Spec

**Direction:** Linear/Vercel-inspired minimalist neutral. A quiet, near-monochrome grey surface system where the UI recedes and the ticket data is the only texture. One restrained **indigo accent (`#5e6ad2`)** — Linear's exact brand hue — used only for the single primary action and active/selected states. Status/priority color appears exclusively in small pills and dots, never as backgrounds or fills on large surfaces. Depth comes from a surface ladder + hairline borders, not shadows. Type is tight, small, and legible (14px UI base).

This reads as engineered rather than "AI-generated" because it commits to: (1) very few colors, (2) a strict grey scale, (3) hairline 1px borders instead of drop shadows, (4) negative letter-spacing on headings, and (5) generous but consistent 4px-grid spacing.

---

## 1. Color palette

### Light theme (default)

```css
:root {
  /* Background layers */
  --bg-app:        #fbfbfc;
  --bg-surface:    #ffffff;
  --bg-elevated:   #ffffff;
  --bg-inset:      #f4f5f7;
  --bg-hover:      #f4f5f7;
  --bg-active:     #eceef1;

  /* Borders (hairlines) */
  --border-subtle: #ededf0;
  --border-default:#e2e3e8;
  --border-strong: #d4d6dc;

  /* Text */
  --text-primary:  #16171a;
  --text-secondary:#56585f;
  --text-muted:    #8a8f98;
  --text-disabled: #b0b3ba;

  /* Accent (indigo) */
  --accent:        #5e6ad2;
  --accent-hover:  #5058c4;
  --accent-active: #464dad;
  --accent-fg:     #ffffff;
  --accent-text:   #4f59c4;
  --accent-subtle: #eef0fb;
  --accent-border: #cdd2f4;
  --focus-ring:    rgba(94,106,210,0.45);
}
```

### Dark theme

```css
:root[data-theme="dark"] {
  --bg-app:        #0c0d0f;
  --bg-surface:    #141517;
  --bg-elevated:   #1b1c1f;
  --bg-inset:      #1a1b1e;
  --bg-hover:      #1e2023;
  --bg-active:     #26282c;

  --border-subtle: #202225;
  --border-default:#2a2c30;
  --border-strong: #3a3d42;

  --text-primary:  #f7f8f8;
  --text-secondary:#b4b8c0;
  --text-muted:    #8a8f98;
  --text-disabled: #5c5f66;

  --accent:        #6872e5;
  --accent-hover:  #7a83ee;
  --accent-active: #5058c4;
  --accent-fg:     #ffffff;
  --accent-text:   #a5adf0;
  --accent-subtle: rgba(104,114,229,0.16);
  --accent-border: rgba(104,114,229,0.35);
  --focus-ring:    rgba(104,114,229,0.55);
}
```

### Semantic status colors (ticket states)

| State | text (light) | bg (light) | dot | Dark text | Dark bg |
|---|---|---|---|---|---|
| **New** (blue) | `#1d4ed8` | `#eaf0fd` | `#3b82f6` | `#93b4fb` | `rgba(59,130,246,0.16)` |
| **In Progress** (amber) | `#b45309` | `#fdf3e3` | `#f59e0b` | `#f0b866` | `rgba(245,158,11,0.16)` |
| **Resolved** (green) | `#15803d` | `#e9f6ed` | `#22c55e` | `#6ede93` | `rgba(34,197,94,0.16)` |
| **Closed** (grey) | `#56585f` | `#f1f2f4` | `#9ca3af` | `#a0a4ac` | `rgba(156,163,175,0.14)` |
| **Reopened** (rose) | `#be123c` | `#fdeaef` | `#f43f5e` | `#f68ba1` | `rgba(244,63,94,0.16)` |

### Priority colors (dot / bar indicators — no filled backgrounds)

| Priority | Color | Text-safe |
|---|---|---|
| **Low** | `#8a8f98` grey | — |
| **Medium** | `#d99e2b` amber | `#a16207` |
| **High** | `#e8833a` orange | `#c2410c` |
| **Urgent** | `#e5484d` red | `#dc2626` |

Feedback: success=green, error=red, warning=amber, info=blue.

---

## 2. Typography

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
--font-mono: ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace;
```
`font-feature-settings: 'cv01' 1, 'cv02' 1, 'ss03' 1, 'zero' 1;` + antialiased.

| Token | Use | Size | Weight | Line-height | Tracking |
|---|---|---|---|---|---|
| `--fs-title` | Page title | 24px | 600 | 1.25 | -0.02em |
| `--fs-heading` | Section heading | 18px | 600 | 1.35 | -0.011em |
| `--fs-subhead` | Card/panel title | 15px | 600 | 1.4 | -0.006em |
| `--fs-body` | Body / table (base) | 14px | 400 | 1.5 | 0 |
| `--fs-body-strong` | Emphasized body | 14px | 500 | 1.5 | 0 |
| `--fs-label` | Labels, buttons | 13px | 500 | 1.4 | 0 |
| `--fs-caption` | Meta, badges | 12px | 500 | 1.35 | +0.002em |

Only three weights: 400 / 500 / 600. No 700+.

---

## 3. Spacing & layout

```css
--space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-5:20px;
--space-6:24px; --space-8:32px; --space-10:40px; --space-12:48px; --space-16:64px;
--radius-sm:4px; --radius-md:6px; --radius-lg:8px; --radius-xl:12px; --radius-pill:9999px;
```

Layout: persistent left **sidebar 240px** (collapsible 56px) + main content, no global top bar. Contextual sub-header (height 56px, sticky, border-bottom) inside main column. Sidebar `bg-surface` + `border-right subtle`; nav items 13px/500, height 32px, radius-md; active = `accent-subtle` bg + `accent-text`. Main content `bg-app`, padding `space-6`.

Max widths: queue table fluid; forms 640px; ticket detail two-col (conversation 1fr + right rail 320px, gap space-8), capped 1200px centered, collapses under 900px. Row height 44px default / 36px compact. No zebra stripes — hairline dividers + hover only.

---

## 4. Elevation (prefer borders; shadows only for floating things)

```css
--shadow-xs: 0 1px 2px rgba(16,17,20,0.04);
--shadow-sm: 0 1px 2px rgba(16,17,20,0.05), 0 1px 1px rgba(16,17,20,0.03);
--shadow-md: 0 4px 8px -2px rgba(16,17,20,0.08), 0 2px 4px -2px rgba(16,17,20,0.05);
--shadow-lg: 0 12px 32px -8px rgba(16,17,20,0.14), 0 4px 10px -6px rgba(16,17,20,0.08);
/* dark: deeper, always pair floating shadow with border-default */
```
Cards/panels → border only. Menus → shadow-md. Modals/toasts → shadow-lg.

---

## 5. Component patterns

- **Status badge:** pill (radius-pill), height 22px, tinted bg + 6px colored dot + 12px/500 label. Never solid saturated fill.
- **Priority:** icon/dot tinted in priority color before title; Urgent may tint row `rgba(229,72,77,0.04)`.
- **Queue = TABLE, not cards** (agents scan columns: pri, id, subject, status, requester, assignee, age). Grid row, 44px, hover `bg-hover`, selected `accent-subtle`. Column headers 12px/500 muted.
- **Ticket detail:** left (1fr) header + threaded timeline (bordered blocks radius-lg, internal notes `bg-inset`), composer at bottom; right rail 320px labeled meta fields with dividers.
- **Buttons:** height 32px, radius-md, 13px/500. Primary=accent bg (one per view); Secondary=surface + border-default, hover border-strong; Ghost=transparent, hover bg-hover; Danger=red. Small=28px.
- **Inputs:** min-height 34px, padding 8/12, border-default, radius-md, 14px; focus = accent border + 3px focus-ring; invalid = red border. Label above 13px/500; helper/error below 12px.
- **Toasts:** bottom-right, bg-elevated, radius-lg, shadow-lg, 3px left accent bar in semantic color, max-width 380px, auto-dismiss 4–6s, slide-in 180ms.
- **Empty states:** centered max-width 360px, muted 40px line-icon, 15px/600 headline, 14px secondary line, one primary button. Flat, quiet.

---

## 6. Motion

```css
--ease: cubic-bezier(0.2,0,0,1);
--dur-fast:100ms; --dur-base:150ms; --dur-slow:200ms;
```
Hover = bg shift only (no transform/scale/shadow). Focus-visible = 3px ring always. Dropdowns fade+4px rise; modals fade+scale 0.98→1; toasts slide from bottom. Skeletons use bg-inset shimmer 1.2s. Respect `prefers-reduced-motion`.

**Implementation:** all tokens in one `tokens.css`, `[data-theme="dark"]` block after; toggle via `data-theme` on `<html>` (default `prefers-color-scheme`). Components consume only semantic tokens — no raw hex.
