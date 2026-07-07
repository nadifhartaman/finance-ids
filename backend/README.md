# finance-ids backend

Express 5 + TypeScript REST API for the Indismart Internal Financial Dashboard. Reads and writes live Supabase (Postgres) data and serves it to the [Next.js frontend](../my-app). Deployed on Railway at `https://finance-ids-production.up.railway.app`.

For product/domain context (target user, jargon glossary, KPIs) see the root [`CLAUDE.md`](../CLAUDE.md). For agent-facing implementation rules see [`CLAUDE.md`](./CLAUDE.md) in this folder.

## Tech stack

- **Runtime/framework:** Express 5, TypeScript (strict mode), Node with `tsx` for dev
- **Database:** Supabase (Postgres) via `@supabase/supabase-js` — service-role key only, server-side
- **Other deps:** `cors`, `dotenv`

| Dependency | Version |
|---|---|
| `@supabase/supabase-js` | ^2.110.0 |
| `express` | ^5.2.1 |
| `cors` | ^2.8.6 |
| `dotenv` | ^17.4.2 |

Dev: `typescript` ^6.0.3, `tsx` ^4.23.0, `@types/express`, `@types/cors`, `@types/node`.

## Getting started

### Prerequisites

- Node.js and npm
- Access to the project's Supabase instance (API keys + DB connection string)

### Environment variables

Copy `.env.example` to `.env` and fill in the secrets. Never commit `.env`.

| Variable | Required | Notes |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project API URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Secret. Server-side only — bypasses RLS. Never expose to the frontend, logs, or error messages |
| `SUPABASE_ANON_KEY` | Yes | Used only for Supabase Auth sign-in calls, never for data access |
| `DATABASE_URL` | For migrations only | Direct Postgres (session pooler) connection string, used by `psql` — not read by the running app |
| `PORT` | No | Defaults to `4000` |
| `APP_TODAY` | No | `YYYY-MM-DD` override for what the API considers "today" (business-logic date-travel for demoing frozen seed data). Must be **unset** in production |

The app fails fast at startup if `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, or `SUPABASE_ANON_KEY` is missing (`src/lib/env.ts`).

### Commands

Run from `backend/`:

```bash
npm install
npm run dev     # tsx watch src/index.ts — dev server with reload
npm run build   # tsc — compile to dist/
npm run start   # node dist/index.js — run the production build
```

There is no test or lint script configured yet.

## Database & migrations

- Schema lives in `supabase/migrations/000N_*.sql`, one file per change, applied with:
  ```bash
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -1 -f <file>
  ```
  Never edit an applied migration — write a new one.
- Seed data: `supabase/seed.sql` (demo data, safe to regenerate/reapply).
- After every migration, regenerate types:
  ```bash
  npx supabase gen types typescript --project-id <ref> --schema public > src/types/database.ts
  ```
  (needs `SUPABASE_ACCESS_TOKEN` set, or run `supabase login` first).
- Full schema reference: [`docs/erd.md`](../docs/erd.md) at the repo root.
- **RLS is enabled with zero policies (deny-all)** on every table. The service-role key bypasses RLS entirely — authorization is enforced by this API's middleware, not the database.

## Authentication & authorization

- `POST /api/auth/login` authenticates against Supabase Auth and returns a bearer token.
- Every route except `/api/auth/login` and the health checks requires a valid token, enforced by the `requireAuth` middleware, which attaches `req.user = { id, name, role }`.
- Specific write routes are additionally gated by `requirePermission(action)`, checked against the role → action map below.
- Send the token on subsequent requests as `Authorization: Bearer <token>`.

### Roles

`superadmin`, `admin`, `director`, `member`

### Permission map

| Action | Allowed roles |
|---|---|
| `invoices.write` | superadmin, admin |
| `spending.write` | superadmin, admin |
| `projects.write` | superadmin, admin |
| `projects.flag` | superadmin, admin, director |
| `budgets.edit` | superadmin, admin, director |
| `targets.edit` | superadmin, admin, director |
| `notes.write` | superadmin, admin, director |
| `users.manage` | superadmin |

## Conventions

- All money amounts are **integers in IDR** (no cents) — stored and returned as whole rupiah.
- Dates are `YYYY-MM-DD`. Month-period params/paths are the first of the month, `YYYY-MM-01`.
- Error responses are always `{ "error": "<message>" }`.
  - `400` — validation error
  - `401` — missing/invalid auth token
  - `403` — authenticated but lacking the required permission
  - `404` — resource not found
  - `500` — unhandled error (central error handler)

---

## API reference

Base path for everything below (except health checks) is `/api`.

### Health

No authentication required.

#### `GET /api/health`

Response:
```json
{ "status": "ok" }
```

#### `GET /api/health/db`

Checks DB connectivity.

Response:
```json
{ "status": "ok", "clients": 12 }
```

### Auth

#### `POST /api/auth/login`

No authentication required.

Request body:
```json
{ "email": "string", "password": "string" }
```

Response:
```json
{
  "token": "string",
  "expiresAt": "string",
  "user": { "id": "string", "name": "string", "role": "superadmin|admin|director|member" }
}
```

Fails with `401` if credentials are invalid, or if `profiles.is_active` is false for the user.

### Me

Requires: authenticated (any role).

#### `GET /api/me`

Response:
```json
{ "user": { "id": "string", "name": "string", "role": "superadmin|admin|director|member" } }
```

### Users

Requires: authenticated + `users.manage` (superadmin only).

#### `GET /api/users`

Response:
```json
{ "users": [ { "...": "user record" } ] }
```

#### `POST /api/users`

Request body:
```json
{ "email": "string", "password": "string", "fullName": "string", "role": "superadmin|admin|director|member" }
```

Response: `201`
```json
{ "user": { "...": "created user record" } }
```

#### `PATCH /api/users/:id/role`

Request body:
```json
{ "role": "superadmin|admin|director|member" }
```

Response:
```json
{ "ok": true }
```

#### `PATCH /api/users/:id/active`

Request body:
```json
{ "isActive": true }
```

Response:
```json
{ "ok": true }
```

Blocks a user from deactivating their own account.

### Notes

Requires: authenticated (any role can read; writing requires `notes.write`).

#### `GET /api/notes`

Response:
```json
{ "notes": [ { "id": "string", "authorId": "string", "entity": "string", "entityId": "string|null", "body": "string", "createdAt": "string" } ] }
```

#### `POST /api/notes`

Requires: `notes.write` (superadmin, admin, director).

Request body:
```json
{ "body": "string" }
```

Response: `201`
```json
{ "id": "string" }
```

### Dashboard

Requires: authenticated (any role).

#### `GET /api/dashboard`

No params. This is the Director-facing landing page — everything needed to see company health in one call.

Response:
```json
{
  "asOf": "YYYY-MM-DD",
  "period": "string",
  "headlineStats": [
    {
      "id": "string",
      "label": "string",
      "value": "string",
      "status": "good|watch|action",
      "note": "string",
      "delta": { "text": "string", "direction": "up|down", "upIsGood": true }
    }
  ],
  "attentionItems": [
    { "id": "string", "severity": "critical|warning", "message": "string", "suggestedAction": "string" }
  ],
  "totalUnpaid": 0,
  "unpaidInvoices": [
    { "id": "string", "number": "string", "client": "string", "project": "string", "amount": 0, "outstanding": 0, "dueDate": "YYYY-MM-DD", "status": "string" }
  ],
  "projectStats": {
    "active": 0,
    "nearBilling": 0,
    "overBudget": 0,
    "pipelineValue": 0,
    "flaggedProject": null
  }
}
```

- `headlineStats` covers Cash on Hand, Revenue (this period), Operating Profit.
- `unpaidInvoices` is the top 4 invoices by outstanding amount.

### Invoices

Requires: authenticated (any role can read; writes require `invoices.write`).

#### `GET /api/invoices`

No params.

Response:
```json
{
  "asOf": "YYYY-MM-DD",
  "invoices": [
    {
      "id": "string", "number": "string", "client": "string", "project": "string",
      "amount": 0, "amountPaid": 0, "outstanding": 0,
      "issuedDate": "YYYY-MM-DD", "dueDate": "YYYY-MM-DD", "paidDate": "YYYY-MM-DD|null",
      "status": "void|paid|overdue|partially-paid|awaiting"
    }
  ],
  "summary": { "totalUnpaid": 0, "totalOverdue": 0, "totalAwaiting": 0, "averageDaysToPay": 0 }
}
```

Status precedence: `void` > `paid` > `overdue` > `partially-paid` > `awaiting`.

#### `POST /api/invoices`

Requires: `invoices.write`.

Request body:
```json
{ "invoiceNumber": "string", "projectId": "string", "amount": 0, "issuedDate": "YYYY-MM-DD", "dueDate": "YYYY-MM-DD" }
```

Constraints: `amount > 0`, `dueDate >= issuedDate`.

Response: `201`
```json
{ "id": "string" }
```

#### `PATCH /api/invoices/:id`

Requires: `invoices.write`.

Request body:
```json
{ "amount": 0, "issuedDate": "YYYY-MM-DD", "dueDate": "YYYY-MM-DD" }
```

Response:
```json
{ "ok": true }
```

#### `PATCH /api/invoices/:id/payment`

Requires: `invoices.write`.

Request body:
```json
{ "amountReceived": 0, "receivedDate": "YYYY-MM-DD" }
```

Records a real payment against the invoice (updates `amount_paid`, sets `paid_date` once fully settled — status is always derived, never set directly). Rejects overpayment and rejects payments against voided or already-paid invoices (`400`).

Response:
```json
{ "ok": true }
```

#### `PATCH /api/invoices/:id/void`

Requires: `invoices.write`. No body.

Blocked with `400` if the invoice is already voided or has `amount_paid > 0` (refund first).

Response:
```json
{ "ok": true }
```

### Projects

Requires: authenticated (any role can read; writes require `projects.write` unless noted).

#### `GET /api/projects`

No params.

Response:
```json
{
  "projects": [
    {
      "id": "string", "name": "string", "client": "string", "productLine": "VIANA|ORION|AIoT|Indi AI|3D Digital Twin",
      "contractValue": 0, "billedToDate": 0, "budget": 0, "spent": 0, "isFlagged": false,
      "health": { "kind": "over-budget|near-billing|on-schedule", "label": "string", "progressPct": 0 }
    }
  ],
  "stats": { "active": 0, "nearBilling": 0, "overBudget": 0, "pipelineValue": 0, "flaggedProject": null }
}
```

#### `POST /api/projects`

Requires: `projects.write`.

Request body — either an existing client via `clientId`, or an inline new client via `newClient`:
```json
{
  "clientId": "string",
  "name": "string",
  "productLine": "VIANA|ORION|AIoT|Indi AI|3D Digital Twin",
  "contractValue": 0,
  "budget": 0
}
```
or
```json
{
  "newClient": { "name": "string", "clientType": "government|private" },
  "name": "string",
  "productLine": "VIANA|ORION|AIoT|Indi AI|3D Digital Twin",
  "contractValue": 0,
  "budget": 0
}
```

Response: `201`
```json
{ "id": "string" }
```

#### `PATCH /api/projects/:id`

Requires: `projects.write`. Client is immutable post-create.

Request body:
```json
{ "name": "string", "productLine": "VIANA|ORION|AIoT|Indi AI|3D Digital Twin", "contractValue": 0 }
```

Response:
```json
{ "ok": true }
```

#### `DELETE /api/projects/:id`

Requires: `projects.write`. Hard delete. Rejected with `400` if the project has any financial history (invoices or spending).

Response:
```json
{ "ok": true }
```

#### `PATCH /api/projects/:id/flag`

Requires: `projects.flag` (superadmin, admin, director).

Request body:
```json
{ "isFlagged": true }
```

Response:
```json
{ "ok": true }
```

#### `PATCH /api/projects/:id/budget`

Requires: `budgets.edit` (superadmin, admin, director) — not `projects.write`.

Request body:
```json
{ "budget": 0 }
```

Constraint: `budget >= 0`.

Response:
```json
{ "ok": true }
```

### Clients

Requires: authenticated (any role).

#### `GET /api/clients`

Response:
```json
{ "clients": [ { "id": "string", "name": "string", "clientType": "government|private" } ] }
```

### Budgets

Requires: authenticated (any role can read; writes require `budgets.edit`).

#### `GET /api/budgets`

Query params:

| Param | Values | Default |
|---|---|---|
| `scope` | `YYYY-MM-01` (a specific month) or `all` | current month |

Every response is single-timeframe — don't sum category and project budgets together (`project_costs` expenses live in both and would double-count).

Response (month scope):
```json
{
  "scope": { "kind": "month", "period": "YYYY-MM-01", "label": "string", "isCurrent": true },
  "availableMonths": ["YYYY-MM-01"],
  "categoryBudgets": [
    { "category": "payroll|operations|project_costs", "plannedAmount": 0, "spent": 0, "health": { "kind": "on-track|near-limit|over", "label": "string", "pctUsed": 0, "remaining": 0 } }
  ],
  "projectBudgets": [
    { "projectId": "string", "name": "string", "budget": 0, "spent": 0, "health": null }
  ],
  "totals": { "budget": 0, "spent": 0, "remaining": 0, "pctUsed": 0 },
  "projectNote": "string",
  "budgetInsights": ["string"]
}
```

`all` scope compares whole-project budgets against cumulative spend, and category budgets against all-time category spend, instead of a single month.

#### `PATCH /api/budgets/categories/:category`

Requires: `budgets.edit`. `:category` is one of `payroll`, `operations`, `project_costs`.

Request body:
```json
{ "plannedAmount": 0 }
```

Constraint: `plannedAmount >= 0`.

Response:
```json
{ "ok": true }
```

### Trends

Requires: authenticated (any role can read; writes require `targets.edit`).

#### `GET /api/trends`

No params. Scoped to the current calendar year (via the server's reference "today").

Response:
```json
{
  "monthlyRevenue": [ { "month": "string", "revenue": 0, "target": 0 } ],
  "revenueByProductLine": [ { "productLine": "string", "amount": 0 } ],
  "revenueByClientType": [ { "type": "government|private", "amount": 0 } ],
  "revenueThisYear": 0,
  "yearTargetPct": 0,
  "governmentSharePct": 0,
  "topProductLine": "string",
  "currentPeriod": "YYYY-MM-01",
  "currentTarget": 0
}
```

#### `PATCH /api/trends/targets/:period`

Requires: `targets.edit` (superadmin, admin, director). `:period` format `YYYY-MM-01`.

Request body:
```json
{ "targetAmount": 0 }
```

Constraint: `targetAmount >= 0`.

Response:
```json
{ "ok": true }
```
