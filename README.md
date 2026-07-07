# finance-ids

The Indismart Internal Financial Dashboard — replaces manual/Excel-based financial reporting with a single internal dashboard so leadership can see company financial health without waiting on manual report consolidation.

**Company:** Indismart Kreatif Solusi — AI & IoT solutions company (Bandung, Indonesia). Project-based B2G/B2B business: clients include government agencies (Bapenda, Dishub, Diskominfo, Komdigi, Kemenperin, RSUD Hasan Sadikin) and private enterprise (Pertamina). Product lines: VIANA (AI video analytics), ORION (IoT data platform), AIoT (Smart ID/NFC), Indi AI (smart city platform), 3D Digital Twin.

**Primary user:** the Director — non-technical, not a finance professional. The whole product is built around plain-language copy, a shallow 5-page nav, and headline numbers with 🔴/🟡/🟢 status instead of raw ratios. See [`CLAUDE.md`](./CLAUDE.md) for the full product/domain rules, jargon glossary, and KPI list.

## Live app

- **Backend API:** `https://finance-ids-production.up.railway.app` — see [`backend/README.md`](./backend/README.md)
- **Frontend:** not yet deployed to production — see [`my-app/README.md`](./my-app/README.md) for local setup

## Repo layout

| Path | What it is |
|---|---|
| [`my-app/`](./my-app) | Frontend — Next.js 16 + React 19 + Tailwind 4. Setup, routes, architecture: [`my-app/README.md`](./my-app/README.md) |
| [`backend/`](./backend) | Backend — Express 5 + TypeScript API on Supabase. Setup, full API reference: [`backend/README.md`](./backend/README.md) |
| [`reference/tailgrids/`](./reference/tailgrids) | TailGrids (React + Tailwind component library) — the UI/UX design reference the frontend imitates. **Read-only**, never edited or imported at runtime. |
| [`docs/erd.md`](./docs/erd.md) | Database schema (Mermaid ERD, table rationale, derived-values rules) that `backend/supabase/migrations/` implements |
| `docs/agents/` | Agent-facing process docs: issue tracking, triage labels, domain-doc conventions |
| `.scratch/<feature-slug>/` | Local issue tracker / PRDs (no remote tracker) |

## Architecture at a glance

```
Browser
  │  (session cookie only, no direct data access)
  ▼
my-app (Next.js, Server Components + Server Actions)
  │  Bearer token, fetch()
  ▼
backend (Express API)
  │  service-role key, bypasses RLS
  ▼
Supabase (Postgres)
```

- The frontend never talks to Supabase directly — all data flows through the Express API.
- Auth: Supabase Auth issues a token on login; the backend validates it (`requireAuth`) and gates writes by role (`requirePermission`); the frontend stores it in an httpOnly cookie and forwards it server-side.
- 4 roles: `superadmin`, `admin`, `director`, `member`.

## Getting started

Both apps need to run together for local development:

```bash
# Terminal 1 — backend (see backend/README.md for env vars)
cd backend && npm install && npm run dev   # http://localhost:4000

# Terminal 2 — frontend (see my-app/README.md for env vars)
cd my-app && npm install && npm run dev    # http://localhost:3000
```

The frontend's `API_URL` env var must point at the backend (defaults to `http://localhost:4000`).

## Status

- **Frontend:** all 5 pages built (Dashboard, Invoices, Budgets, Projects, Trends), wired to the backend API behind real login, role-gated edit affordances.
- **Backend:** authenticated read + write API backed by real Supabase data, deployed to Railway. User management and write endpoints for invoices/projects/budgets/trends are live; audit logging is partial.
- **Not yet done:** full write-path audit logging, user-management audit coverage.

See each app's `README.md`/`CLAUDE.md` for current detail, and `docs/agents/issue-tracker.md` for how in-flight work is tracked.

## Contributing

- Read the relevant `CLAUDE.md` before making changes — root for product/domain rules, [`backend/CLAUDE.md`](./backend/CLAUDE.md) and [`my-app/CLAUDE.md`](./my-app/CLAUDE.md) for app-specific implementation rules.
- Issues/PRDs are tracked as local markdown files under `.scratch/<feature-slug>/`, not a remote tracker.
