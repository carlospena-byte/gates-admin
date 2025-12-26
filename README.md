# gates-admin

React + Vite + Supabase + shadcn/ui starter.

## Requirements

- Node `>=20.19` (see `.nvmrc`)

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Supabase

- Client: `src/lib/supabaseClient.ts`
- Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## shadcn/ui

- Config: `components.json`, `tailwind.config.ts`
- Components: `src/components/ui/*`
