#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if command -v supabase >/dev/null 2>&1; then
  supabase stop --workdir . || true
fi

if command -v docker >/dev/null 2>&1; then
  docker compose -f docker-compose.mailpit.yml down || true
fi

