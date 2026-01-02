#!/usr/bin/env bash
# Setup local development environment
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "🚀 Setting up local development environment..."
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Stop any running Supabase instance
echo ""
echo "🛑 Stopping any running Supabase instance..."
supabase stop --workdir . || true

# Start Supabase (minimal services for development)
echo ""
echo "🔵 Starting Supabase..."
supabase start --workdir . --exclude realtime,storage-api,imgproxy,logflare,vector

# Get service role key from Supabase status
echo ""
echo "🔑 Getting Supabase credentials..."
echo ""
if [[ -f "supabase/db.backup.sql" ]]; then
  echo "💾 Restoring local database from supabase/db.backup.sql..."
  npm run db:restore
else
  echo "ℹ️  No supabase/db.backup.sql found; skipping restore."
  echo "   After you have local data you want to keep, run:"
  echo "     npm run db:backup"
fi

# Generate TypeScript types
echo ""
echo "📝 Generating TypeScript types..."
npm run types

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Run: npm run dev"
echo "  2. Open: http://localhost:5173"
echo "  3. Login with an email that exists in your backup data"
echo ""
