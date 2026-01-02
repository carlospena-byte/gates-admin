# gates-admin

React + Vite + Supabase + shadcn/ui starter.

## Requirements

- Node `>=24.12` (see `.nvmrc`)

## Setup

```bash
npm install
```

## Supabase

- Client: `src/lib/supabaseClient.ts`
- Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- Migrations: `supabase/migrations/*`
- Reference schema: `supabase/schema.sql`
- Local config: `supabase/config.toml`

## Local development (Docker + Supabase + Mailpit)

Quick start:
```bash
cp .env.development.example .env.development
npm run dev
```

Stop local services (Supabase + Mailpit):
```bash
npm run stop:local
```

Optional (reset DB when starting):
```bash
SKIP_DB_RESTORE=1 npm run dev
```

Mailpit UI:
- `http://localhost:8025`

Notes:
- Docker Desktop must be running (the script will fail fast if not).
- `npm run dev` starts Mailpit + local Supabase + Vite + Edge Functions.
- If sending OTP returns a 500, ensure Mailpit is running and SMTP is reachable on `localhost:1025`.
- If `supabase/db.backup.sql` exists, `npm run dev` will auto-restore app data from it (set `SKIP_DB_RESTORE=1` to skip).
- Residential signup is at `/#signup` (or click “Create a residential” on the login page).

## Staging / Production

```bash
cp .env.staging.example .env.staging
npm run dev:staging
```

```bash
cp .env.production.example .env.production
npm run dev:prod
```

## shadcn/ui

- Config: `components.json`, `tailwind.config.ts`
- Components: `src/components/ui/*`
