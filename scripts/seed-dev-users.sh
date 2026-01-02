#!/bin/bash
# Seed development users via Supabase Admin API
# This script creates test users for all roles

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "🌱 Seeding development users..."
echo ""

# Get Supabase credentials from status
SUPABASE_STATUS=$(supabase status --workdir . 2>/dev/null || echo "")

if [ -z "$SUPABASE_STATUS" ]; then
  echo -e "${RED}❌ Error: Supabase is not running${NC}"
  echo "   Run: supabase start --workdir ."
  exit 1
fi

API_URL=$(echo "$SUPABASE_STATUS" | grep "API URL" | awk '{print $3}')
SERVICE_KEY=$(echo "$SUPABASE_STATUS" | grep "service_role key" | awk '{print $3}')

if [ -z "$SERVICE_KEY" ]; then
  # Try alternative format
  SERVICE_KEY=$(echo "$SUPABASE_STATUS" | grep "Secret key" | awk '{print $3}')
fi

if [ -z "$API_URL" ] || [ -z "$SERVICE_KEY" ]; then
  echo -e "${RED}❌ Error: Could not get Supabase credentials${NC}"
  exit 1
fi

echo "API URL: $API_URL"
echo ""

# Function to create user
create_user() {
  local email=$1
  local password=$2
  local role_name=$3

  echo -n "Creating $role_name ($email)... "

  response=$(curl -s -X POST "$API_URL/auth/v1/admin/users" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\",\"email_confirm\":true}")

  user_id=$(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null || echo "")

  if [ -n "$user_id" ]; then
    echo -e "${GREEN}✓${NC} (ID: $user_id)"
  else
    # Check if user already exists
    error_msg=$(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('message', ''))" 2>/dev/null || echo "")
    if [[ "$error_msg" == *"already been registered"* ]] || [[ "$error_msg" == *"already exists"* ]]; then
      echo -e "${YELLOW}⚠ Already exists${NC}"
    else
      echo -e "${RED}✗ Error: $error_msg${NC}"
    fi
  fi
}

# Create test users
echo "👥 Creating test users:"
echo ""
create_user "platformadmin@example.com" "test123" "Platform Admin"
create_user "owner@residential.com" "test123" "Residential Owner"
create_user "admin@residential.com" "test123" "Residential Admin"
create_user "security@residential.com" "test123" "Residential Security"

echo ""
echo -e "${GREEN}✅ User seeding complete!${NC}"
echo ""
echo "📋 Test Credentials:"
echo "  - Platform Admin: platformadmin@example.com / test123"
echo "  - Owner:          owner@residential.com / test123"
echo "  - Admin:          admin@residential.com / test123"
echo "  - Security:       security@residential.com / test123"
echo ""
echo "🔄 Next: Run 'supabase db reset' to apply migrations and seed data"
echo ""
