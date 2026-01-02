#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BACKUP_FILE="${BACKUP_FILE:-supabase/db.backup.sql}"

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI not found. Install it first: https://supabase.com/docs/guides/cli"
  exit 1
fi

echo "Creating local DB backup..."
echo "  File: $BACKUP_FILE"
echo ""

mkdir -p "$(dirname -- "$BACKUP_FILE")"

# This requires the local Supabase DB to be running.
# Backup the full local project data (public + auth + storage) so `npm run dev`
# can restore a consistent snapshot without relying on seeds.
supabase db dump \
  --workdir . \
  --local \
  --data-only \
  --use-copy \
  --schema public,auth,storage \
  --file "$BACKUP_FILE"

echo ""
echo "✅ Backup created: $BACKUP_FILE"
