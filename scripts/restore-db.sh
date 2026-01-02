#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BACKUP_FILE="${BACKUP_FILE:-supabase/db.backup.sql}"

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file not found: $BACKUP_FILE"
  echo "Create one first:"
  echo "  npm run db:backup"
  exit 1
fi

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI not found. Install it first: https://supabase.com/docs/guides/cli"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found. Install Docker Desktop first."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not running. Start Docker Desktop, then re-run."
  exit 1
fi

echo "Restoring local DB from backup..."
echo "  File: $BACKUP_FILE"
echo ""

# Find the local Postgres container for this Supabase project.
PROJECT_ID="$(
  sed -n 's/^project_id[[:space:]]*=[[:space:]]*\"\\([^\"]*\\)\"[[:space:]]*$/\\1/p' supabase/config.toml \
    | head -n 1
)"

DB_CONTAINER=""
if [[ -n "${PROJECT_ID:-}" ]]; then
  DB_CONTAINER="$(docker ps --format '{{.Names}}' | grep -E \"^supabase_db_${PROJECT_ID}$\" | head -n 1 || true)"
fi
if [[ -z "${DB_CONTAINER:-}" ]]; then
  DB_CONTAINER="$(docker ps --format '{{.Names}}' | grep -E '^supabase_db_' | head -n 1 || true)"
fi

if [[ -z "${DB_CONTAINER:-}" ]]; then
  echo "Could not find a running Supabase Postgres container."
  echo "Make sure local Supabase is running (npm run dev)."
  exit 1
fi

AUTO_RESET_IF_MISSING="${AUTO_RESET_IF_MISSING:-1}"

# If the project schema isn't applied yet (e.g. after deleting volumes), apply migrations first.
HAS_PUBLIC_UNITS="$(
  docker exec -i "$DB_CONTAINER" bash -lc "PGPASSWORD=postgres psql -U supabase_admin -d postgres -tAc \"select to_regclass('public.units') is not null\" 2>/dev/null" \
    | tr -d '[:space:]'
)"

if [[ "${RESET_BEFORE_RESTORE:-0}" == "1" ]] || { [[ "$AUTO_RESET_IF_MISSING" == "1" ]] && [[ "${HAS_PUBLIC_UNITS:-}" != "t" ]]; }; then
  echo "Applying migrations (supabase db reset --no-seed) before restore..."
  supabase db reset --workdir . --no-seed

  # Container name can change after reset; re-detect it.
  if [[ -n "${PROJECT_ID:-}" ]]; then
    DB_CONTAINER="$(docker ps --format '{{.Names}}' | grep -E \"^supabase_db_${PROJECT_ID}$\" | head -n 1 || true)"
  fi
  if [[ -z "${DB_CONTAINER:-}" ]]; then
    DB_CONTAINER="$(docker ps --format '{{.Names}}' | grep -E '^supabase_db_' | head -n 1 || true)"
  fi
fi

echo "Importing SQL into container: $DB_CONTAINER"
# Clear existing data first, so the restore is idempotent.
docker exec -i "$DB_CONTAINER" bash -lc "PGPASSWORD=postgres psql -v ON_ERROR_STOP=1 -U supabase_admin -d postgres" <<'SQL'
do $$
declare
  r record;
begin
  perform set_config('session_replication_role', 'replica', true);

  -- Truncate the backed up schemas so restore is idempotent.
  for r in (
    select schemaname, tablename
    from pg_tables
    where schemaname in ('public', 'auth', 'storage')
  ) loop
    execute format('truncate table %I.%I cascade', r.schemaname, r.tablename);
  end loop;

  perform set_config('session_replication_role', 'origin', true);
end $$;
SQL

# pg_dump --data-only can fail to restore when there are circular FK constraints.
# In Postgres, FK enforcement is implemented via triggers, so temporarily disabling triggers
# (via session_replication_role) makes the import order-insensitive.
{
  echo "set session_replication_role = replica;";
  cat "$BACKUP_FILE";
  echo "set session_replication_role = origin;";
} | docker exec -i "$DB_CONTAINER" bash -lc "PGPASSWORD=postgres psql -v ON_ERROR_STOP=1 -U supabase_admin -d postgres --single-transaction"

echo ""
echo "✅ Restore complete."
