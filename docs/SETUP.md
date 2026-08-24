# Local Development Setup

## Quick Start

Run the automated setup script:

```bash
bash scripts/setup-local.sh
```

This will:
1. Install npm dependencies
2. Start Supabase (minimal services)
3. Restore local DB from `supabase/db.backup.sql` (if present)
4. Generate TypeScript types

## Running the App

```bash
npm run dev
```

Then open http://localhost:5173

## Manual Commands

### Database Management

```bash
# Create a backup snapshot of local data (public + auth + storage)
npm run db:backup

# Restore local data from supabase/db.backup.sql
npm run db:restore

# Generate TypeScript types
npm run types
```

### Supabase Management

```bash
# Check status
supabase status

# Stop services
supabase stop

# Start services
supabase start --exclude realtime,storage-api,imgproxy,logflare,vector
```

## Troubleshooting

### Login Issues

If you see "Database error finding user":
1. Make sure Supabase is running: `supabase status`
2. Re-run restore: `npm run db:restore`
3. Check auth logs: `docker logs supabase_auth_gates-admin`

### Container Health Check Failures

The setup excludes problematic services (storage-api, imgproxy, analytics/logflare, vector) that aren't needed for development and sometimes fail health checks.

If you need storage functionality, you can try starting with storage enabled:
```bash
supabase start --exclude realtime,imgproxy,logflare,vector
```

### Database Reset

To start completely fresh:
```bash
supabase stop
docker volume rm supabase_db_gates-admin
bash scripts/setup-local.sh
```

## Architecture Changes
Development uses a DB snapshot approach:
- Create snapshot: `npm run db:backup`
- Auto-restore on start: `npm run dev` (unless `SKIP_DB_RESTORE=1`)

### Minimal Services

Development now runs with minimal services to avoid health check issues:
- ✅ Core: database, auth, API, studio
- ❌ Excluded: realtime, storage-api, imgproxy, analytics/logflare, vector

This makes startup faster and more reliable for admin app development.
