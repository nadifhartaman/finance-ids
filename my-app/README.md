# Indismart Internal Financial Dashboard (Frontend)

Next.js 16 + React 19 frontend for the Indismart Internal Financial Dashboard — a 5-page internal tool (Dashboard, Invoices, Trends, Budgets, Projects) that gives a non-technical Director a plain-language view of company financial health, backed by the [Express API](../backend).

**Live:** [`https://finance-ids.vercel.app`](https://finance-ids.vercel.app)

## Tech stack

| | |
|---|---|
| Framework | Next.js 16 (App Router only, no `pages/`) |
| UI | React 19 |
| Styling | Tailwind CSS 4 (CSS-based `@theme` tokens in `src/app/globals.css`, no `tailwind.config.js`) |
| Charts | `recharts` |
| Interactive primitives | `react-aria-components` (dropdown, dialog) |
| Component variants | `class-variance-authority` (`cva`), `clsx` + `tailwind-merge` (`src/lib/cn.ts`) |
| Language | TypeScript, strict mode |
| Lint | ESLint 9 (flat config, `eslint-config-next`) |

No database client — all data comes from the Express API over `fetch`. No test framework is set up yet.

## Getting started

### Prerequisites

- Node.js and npm
- The [backend API](../backend) running locally, or a deployed backend URL

### Environment variables

Create `my-app/.env.local` (gitignored, not committed):

```bash
# Server-side only — no NEXT_PUBLIC_ prefix, since all backend calls
# happen in Server Components / Server Actions, never in the browser.
API_URL=http://localhost:4000

# Or point at the deployed backend:
# API_URL=https://finance-ids-production.up.railway.app
```

`API_URL` defaults to `http://localhost:4000` if unset.

### Commands

Run from `my-app/`:

```bash
npm install
npm run dev     # start the dev server
npm run build   # production build
npm run start   # serve the production build
npm run lint    # ESLint
```

## Routes

Flat structure, one sidebar, no nesting — the Dashboard stands alone as the Director's full health picture:

| Page | Path | File |
|---|---|---|
| Dashboard | `/` | `src/app/(app)/page.tsx` |
| Invoices | `/invoices` | `src/app/(app)/invoices/page.tsx` |
| Trends | `/trends` | `src/app/(app)/trends/page.tsx` |
| Budgets | `/budgets` | `src/app/(app)/budgets/page.tsx` |
| Projects | `/projects` | `src/app/(app)/projects/page.tsx` |
| Login | `/login` | `src/app/(auth)/login/page.tsx` |

`(app)` and `(auth)` are route groups (don't affect the URL) — `(app)` wraps the 5 product pages in a shared sidebar/topbar shell; `(auth)` holds the login page with no shell.

## Project structure

```
src/
  proxy.ts          # Next 16's middleware equivalent — optimistic auth redirect
  app/
    layout.tsx        # root layout: fonts/metadata only
    globals.css        # design tokens (@theme, Tailwind 4)
    (app)/              # 5 product pages + shared shell, auth-guarded
    (auth)/login/        # login page, no shell
  components/
    shell/    # Sidebar, Topbar, UserMenu, ManageUsersDialog
    ui/       # ported TailGrids primitives (chip, table, dialog, dropdown, cards)
    dashboard/, invoices/, budgets/, projects/, trends/   # feature components
  lib/
    api.ts               # server-side GET fetchers (getDashboard, getInvoices, ...)
    authed-fetch.ts        # server-side authed fetch + patchAction for mutations
    auth.ts                 # getCurrentUser() / getRequiredUser() via GET /api/me
    auth-actions.ts          # "use server" login() / logout()
    session-cookie.ts         # session cookie name constant
    roles.ts                   # Role type, permission map, can() (UI-only copy of backend's)
    *-actions.ts                # server actions per resource (budgets, invoices, projects, notes, users)
    format.ts, cn.ts, types.ts
```

`src/app/` is routes only, `src/components/` is UI, `src/lib/` is data/logic. Path alias `@/*` → `src/*`.

## How it talks to the backend

All backend calls happen server-side (Server Components and Server Actions) — the browser never calls the Express API or Supabase directly.

- **Reads:** `src/lib/api.ts` exposes one fetcher per resource (`getDashboard()`, `getInvoices()`, `getProjects()`, `getClients()`, `getBudgets(scope?)`, `getTrends()`, `getNotes()`) — each reads the session cookie, sends it as `Authorization: Bearer <token>` to the Express API, uses `cache: "no-store"`, and redirects to `/login` on a `401`.
- **Writes:** `src/lib/authed-fetch.ts` provides the same authed-fetch pattern for POST/PATCH/DELETE, plus a shared `patchAction(path, body, revalidatePaths, fallbackError, method)` helper used by the per-resource `*-actions.ts` files.
- See [`backend/README.md`](../backend/README.md) for the full API reference these fetchers call.

## Authentication

- `/login` is a client component using React 19's `useActionState` bound to the `login` server action in `src/lib/auth-actions.ts`.
- `login()` POSTs credentials to `POST /api/auth/login`, then sets an **httpOnly** session cookie (`session-token`, `sameSite: "lax"`, `secure` in production) holding the Supabase access token — 1-week expiry, no refresh flow; users re-log in when it lapses.
- `logout()` deletes the cookie and redirects to `/login`.
- `getCurrentUser()` (`src/lib/auth.ts`, wrapped in React's `cache()` to dedupe per request) reads the cookie and calls `GET /api/me`.
- Auth is enforced in three layers: `src/proxy.ts` does an optimistic cookie-presence redirect before rendering; the `(app)` layout calls `getCurrentUser()` for a real check before any page renders; `api.ts` redirects to `/login` on any mid-session `401` (token expiry/deactivation).
- Roles: `superadmin`, `admin`, `director`, `member` — `src/lib/roles.ts` has a UI-only `PermissionAction → Role[]` map and `can(role, action)` helper, hand-synced with the backend's `src/lib/permissions.ts`. Permission checks are computed server-side and passed down as booleans; the backend is the real enforcement point.

## Design system

UI imitates **TailGrids** (React + Tailwind component library) — components are ported into `src/components/ui/`, never imported at runtime. Theme is white-dominant with purple accents, fixed light (no dark mode).

## Conventions

- App Router only — never add a `pages/` directory.
- Server Components by default; `"use client"` pushed as far down the tree as possible.
- Design tokens live in `@theme` in `globals.css`; components use semantic token classes, never raw hex or palette classes.
- Status colors (good/warning/critical) always ship with an icon or text label, never color alone.
- UI copy is plain language only — no financial jargon, since the primary user (the Director) isn't a finance professional.
