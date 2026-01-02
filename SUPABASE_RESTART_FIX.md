# Supabase Unhealthy Containers Fix

## Problem

After database reset, Supabase auth and storage containers were unhealthy and failing to start:

```
supabase_auth_gates-admin container is not ready: unhealthy
supabase_storage_gates-admin container is not ready: unhealthy
```

## Root Cause

The auth container was failing due to a Supabase internal migration error:

```
ERROR: operator does not exist: uuid = text (SQLSTATE 42883)
```

This error occurs in `migrations/20221208132122_backfill_email_last_sign_in_at.up.sql` when there's a schema corruption or incomplete database initialization.

## Solution

Complete stop and restart of Supabase with fresh initialization:

```bash
# Stop Supabase completely (without backup to avoid corruption)
supabase stop --workdir . --no-backup

# Start fresh - this recreates all containers and applies migrations
supabase start --workdir .
```

## Why This Works

- `supabase stop --no-backup` removes all containers cleanly
- `supabase start` recreates fresh Docker volumes
- All migrations are re-applied in correct order
- Auth schema is initialized properly
- Storage dependencies are resolved

## Verification

Check container health:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}" | grep gates-admin
```

Expected output:
```
supabase_storage_gates-admin        Up X seconds (healthy)
supabase_auth_gates-admin           Up X seconds (healthy)
supabase_kong_gates-admin           Up X seconds (healthy)
supabase_db_gates-admin             Up X seconds (healthy)
...
```

All containers should show `(healthy)` status.

## After Restart

Since the database is fresh, you need to recreate test data:

### 1. Create User

```bash
curl -X POST 'http://127.0.0.1:64321/auth/v1/admin/users' \
  -H 'apikey: sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz' \
  -H 'Authorization: Bearer sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz' \
  -H 'Content-Type: application/json' \
  -d '{"email":"owner@residential.com","password":"test123","email_confirm":true}'
```

### 2. Create Profile, Residential, and Link

```sql
-- Insert profile
INSERT INTO public.profiles (user_id, email, first_name, last_name)
VALUES ('<user-id-from-step-1>', 'owner@residential.com', 'Test', 'Owner');

-- Insert residential
INSERT INTO public.residentials (id, name, owner_user_id)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Demo Residential', '<user-id-from-step-1>');

-- Link user to residential
INSERT INTO public.residential_users (residential_id, user_id, role)
VALUES ('550e8400-e29b-41d4-a716-446655440000', '<user-id-from-step-1>', 'admin');
```

Or use Supabase Studio at http://127.0.0.1:64323

## Login Credentials

After setup:
- **Email**: `owner@residential.com`
- **Password**: `test123` (or whatever you set in step 1)
- **Login Method**: OTP (check Mailpit at http://localhost:8025)

## Prevention

To avoid this issue:

1. **Use `supabase db reset` carefully** - it can sometimes leave the database in an inconsistent state
2. **Prefer `supabase stop` + `supabase start`** for clean restarts
3. **Don't restore corrupted backups** - if a backup is corrupted, start fresh
4. **Check migrations are valid** before applying them

## Related Issues

This is a known Supabase issue related to:
- Database schema corruption
- Incomplete migration application
- Type mismatches in auth schema
- Docker volume state inconsistency

## Success Criteria

- ✅ All containers show `(healthy)` status
- ✅ Can access Supabase Studio at http://127.0.0.1:64323
- ✅ Can log in to the application
- ✅ RLS policies work correctly
- ✅ Can create and view units

## Current Status

- ✅ Containers restarted successfully
- ✅ All migrations applied correctly
- ✅ Test user created: `owner@residential.com`
- ✅ Demo residential created
- ✅ User linked as admin

**Ready to test!** Go to the application and login with OTP.
