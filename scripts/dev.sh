#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MODE="${1:-development}"

ENV_FILE=".env.${MODE}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  echo "Create it from the template:"
  echo "  cp .env.${MODE}.example $ENV_FILE"
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

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI not found. Install it, then re-run: https://supabase.com/docs/guides/cli"
  exit 1
fi

MAILPIT_URL="http://localhost:8025"

echo ""
echo "Local development URLs"
echo "  Mailpit:  $MAILPIT_URL"
echo ""
echo "Starting Mailpit..."
docker compose -f docker-compose.mailpit.yml up -d

if [[ "$MODE" == "development" ]]; then
  echo "Starting Supabase..."
  # Keep local stack light - exclude services that have health check issues
  supabase start --workdir . --exclude realtime,storage-api,imgproxy,logflare,vector

  # Supabase auth reaches Mailpit by container name (see supabase/config.toml),
  # but `supabase start` recreates the auth container on its own network each
  # time, dropping any prior connection. Reconnect Mailpit so OTP emails send.
  docker network connect supabase_network_gates-admin gates-admin-mailpit 2>/dev/null || true

  # If a DB backup exists, restore it automatically (can be skipped via SKIP_DB_RESTORE=1).
  if [[ -f "supabase/db.backup.sql" ]] && [[ "${SKIP_DB_RESTORE:-0}" != "1" ]]; then
    echo "Found supabase/db.backup.sql — restoring local database from backup..."
    bash scripts/restore-db.sh
  else
    echo "No DB backup restore (missing supabase/db.backup.sql or SKIP_DB_RESTORE=1)."
  fi

  SUPABASE_STATUS_JSON="$(supabase status --workdir . --output json 2>/dev/null || true)"
  if [[ -n "$SUPABASE_STATUS_JSON" ]] && command -v node >/dev/null 2>&1; then
    STUDIO_URL="$(node -p "JSON.parse(process.argv[1]).STUDIO_URL || ''" "$SUPABASE_STATUS_JSON" 2>/dev/null || true)"
    API_URL="$(node -p "JSON.parse(process.argv[1]).API_URL || ''" "$SUPABASE_STATUS_JSON" 2>/dev/null || true)"

    if [[ -n "${STUDIO_URL:-}" ]] || [[ -n "${API_URL:-}" ]]; then
      echo ""
      echo "Supabase URLs"
      [[ -n "${STUDIO_URL:-}" ]] && echo "  Studio:   $STUDIO_URL"
      [[ -n "${API_URL:-}" ]] && echo "  API:      $API_URL"
      echo ""
    fi
  fi
fi

cleanup() {
  kill 0 >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

echo "Starting app processes (mode: $MODE)..."
echo "  Vite:     check the Vite output for the local URL"
echo "  Mailpit:  $MAILPIT_URL"
echo ""
npm run dev:vite-only -- --mode "$MODE" &
npm run dev:functions-only -- --env-file "$ENV_FILE" &
wait
