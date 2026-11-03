# Maqam Hotelier Dashboard - Design System

This file is the single source of truth for the look and feel of the Hotelier
Dashboard (`src/hotalier/`). Every new screen, card, modal, or control added to
the hotelier CRM must follow these rules. When a section is changed or
implemented, check it against this file first.

---

## 1. Theme

The hotelier portal uses a **green gradient theme** on a soft sage background.
It must feel calm, fresh, and professional - never loud.

| Token | Value | Usage |
| --- | --- | --- |
| Page background | `#eef5f1` | Layout root (`HotelierLayout`) |
| Sidebar gradient | `linear-gradient(180deg, #064e3b 0%, #065f46 46%, #04372a 100%)` | Sidebar only |
| Hero gradient | `linear-gradient(120deg, #065f46 0%, #047857 55%, #059669 100%)` | Dashboard welcome hero |
| Primary action | Emerald `600` (`bg-emerald-600`), hover `500` | All primary buttons |
| Card background | White (`bg-white`) | Every card, modal, table panel |
| Card border | `border-emerald-100` (1px) | Cards; never heavier than this |
| Soft section tint | `bg-emerald-50/40` - `bg-emerald-50/50` | Quick-action rows, card headers |
| Danger / reject | Red only for destructive confirmation text; reject buttons stay neutral | Status actions |

Rules:

- Gradients are allowed **only** on the sidebar and the dashboard hero.
- No drop shadows heavier than Tailwind `shadow-sm` on content cards. The
  sidebar may use `shadow-2xl` while it slides over content on mobile.
- One accent color (emerald). Do not introduce blue, purple, or orange accents.

## 2. Typography

- **Font family:** Poppins (loaded once in `src/index.css`; the whole body
  inherits it). Fallback stack: `ui-sans-serif, system-ui, "Segoe UI", sans-serif`.
- **Weights:** 400 (body), 500/600 (labels, buttons), 700 (headings, numbers).

| Element | Classes |
| --- | --- |
| Page title (`h2`) | `text-lg font-bold text-emerald-950` |
| Page subtitle | `text-sm text-slate-500` |
| Card title (`h3`) | `text-sm font-bold text-emerald-950` |
| Section label (sidebar group) | `text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200/70` |
| Body / detail text | `text-sm text-slate-600` or `text-[11px] text-slate-500` |
| Big number (stat, occupancy) | `text-2xl`-`text-4xl font-bold text-white` (on green) or `text-emerald-950` |
| Money / totals | `text-sm font-bold text-emerald-700` (or `text-emerald-950` for grand totals) |

Copy style: short, factual, professional. No exclamation marks, no marketing
phrases, no emojis. Sentence case everywhere.

### Font family rules

- Poppins is the **only** font family allowed in the hotelier side. It is
  loaded once in `src/index.css` and every element inherits it -- never set a
  different `font-family` (no Inter, Roboto, system-ui stacks, etc.) on any
  hotelier screen, card, or control.
- The stack declared in `src/index.css` is
  `"Poppins", ui-sans-serif, system-ui, "Segoe UI", sans-serif`. Do not copy
  that stack elsewhere; rely on inheritance.
- If a component arrives with its own font, strip it so it inherits Poppins.
- Weight ladder: 400 (body), 500/600 (labels, buttons), 700 (headings,
  numbers). Do not use 300 or 800.

### Anti AI-slop copy rules (hotelier side)

Keep the hotelier side free of AI slop. Text must read like it was written by
a product team, not generated:

- Banned words and phrases: "at a glance", "seamless", "effortless",
  "empower", "elevate", "supercharge", "unleash", "magic", "streamline",
  "delight", "beautiful", "Ready to", "Get started", "Let's", "Kickstart".
- No exclamation marks, no emojis, no exclamation-style excitement.
- No em dashes anywhere in UI text (headings, subtitles, buttons, toasts,
  empty states). Use a comma or a period instead. Code comments may keep them.
- No chatty filler ("Welcome to ...", "you're all set", "we've got you
  covered"). Success toasts state the fact only: "Welcome back.", "Room
  created, added to your availability".
- Empty states describe what will appear there, plainly ("Bookings from your guests will appear here").
- Sentence case for every string, including buttons and toasts. ALL CAPS only
  through uppercase tracking classes on group labels, never typed in caps.
- Numbers stay factual: "7 of 10 rooms available", never "plenty of rooms
  available".

## 3. Layout

- Layout root: `min-h-screen bg-[#eef5f1]` with a `flex` row - fixed sidebar
  (266px, `w-[266px]`) plus a fluid content column.
- Content wrapper: `mx-auto w-full max-w-[1400px] flex-1 space-y-5 p-3 sm:p-5 lg:p-7`.
- Page header pattern: title + subtitle on the left, primary action button on
  the right (`flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`).
- Cards and grids use `rounded-2xl`; inner chips and buttons use `rounded-lg`
  to `rounded-xl`.
- Responsive grids: 1 column mobile, `sm:grid-cols-2`, `xl:grid-cols-3` for
  card walls; `lg:grid-cols-2` for booking cards.
- The sidebar collapses to an overlay drawer below `md` with a dimmed backdrop
  (`bg-emerald-950/50`) and a close button.

## 4. Components

### Buttons

- Primary: `rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500`.
- Secondary: `rounded-lg bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50`.
- Small action (inside cards): `rounded-lg px-3 py-1.5 text-xs font-semibold`, same color rules.
- Ghost (sidebar): `text-emerald-100/90 hover:bg-white/10 hover:text-white`; active item gets
  `bg-white/15 text-white ring-1 ring-inset ring-white/15` plus a left accent bar (`bg-emerald-300`).

### Availability stepper (+ / -)

Every inventory count (rooms, cab units) is adjusted with a one-click stepper:

- Minus/plus buttons: `grid h-7 w-7 place-items-center rounded-lg bg-white text-emerald-700 ring-1 ring-inset ring-emerald-200 transition hover:bg-emerald-600 hover:text-white`.
- Count between them: `text-xs font-bold text-emerald-900`.
- Never allow availability below 0; growing above `total` also raises `total`.
- Every stepper click must give instant feedback (optimistic state update).

### Status badge

Use the shared `StatusBadge` component (`src/components/admin/StatusBadge.jsx`).
Statuses: `Pending`, `Confirmed`, `Completed`, `Cancelled`. Booking lifecycle:
Pending -> Confirmed -> Completed, or Cancelled from Pending/Confirmed.

### Cards

- Inventory batch card: white, `rounded-2xl border border-emerald-100 shadow-sm`,
  header strip `bg-emerald-50/50` with batch details, body with bordered
  unit blocks and live steppers (`rounded-xl border border-slate-100 bg-slate-50/70`), footer
  with batch status and action buttons.

### Forms and modals

- Modals reuse `Modal` from `src/components/admin/Modal.jsx` with native
  `required` validation inside real `<form>` elements.
- Inputs: `rounded-xl border border-slate-300 bg-white py-2.5 text-sm outline-none
  transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100`.
- Search inputs follow the same focus ring with a leading icon and a clear (X) button.

## 5. Data and behavior

- Live data: Room stock (`GET/POST/PATCH /api/v1/hotelier/stock`) and hotelier profile (`GET /api/v1/auth/me`).
- All mutations must be optimistic-feeling: update state immediately, toast on success/failure, and never block the whole screen for one click.

## 6. Access control

- `/hotelier/*` is guarded by `HotelierRoleRoute` and allows roles
  `hotelier`, `admin`, `super_admin`. Everyone else sees an access-denied card
  or is sent to `/administrators/login`.
- The Admin CRM (`/admin/*`) keeps its own stricter gate
  (`admin/routes/ProtectedRoute.jsx`).
- The shared login (`/administrators/login`) routes `hotelier` accounts to `/hotelier`
  and admin accounts to `/admin/dashboard`.
- Logout always clears the real session (`authStore.logout()`) and returns to
  `/administrators/login`.

## 7. Performance and UX checklist

Before shipping a screen, verify:

- [ ] Follows the green theme, Poppins, and spacing rules above.
- [ ] Fully responsive (mobile drawer, grids collapse, no horizontal overflow).
- [ ] Inventory changes are one click (+ / -) with instant visual feedback.
- [ ] Every list has an empty state and a loading skeleton (pulse blocks).
- [ ] Destructive actions require confirmation; success/failure shows a toast.
- [ ] No unnecessary network calls; mock mode works with zero backend.
