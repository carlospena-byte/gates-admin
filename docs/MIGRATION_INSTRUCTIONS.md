# Migration Instructions - Unit Wizard Tables

## Error You're Seeing

```
ERROR: relation "residentials" does not exist (SQLSTATE 42P01)
```

This means the base tables from the initial migrations haven't been created yet.

## Solution: Run All Migrations in Order

### Option 1: Run All Migrations (Recommended)

If you're using Supabase CLI locally:

```bash
# Make sure you're in the project root
cd /Users/carlospena/Documents/Personal/secret/admin/gates-admin

# Reset and apply all migrations in order
supabase db reset

# Or push all migrations
supabase db push
```

### Option 2: Manual SQL Execution (If using Supabase Dashboard)

Run these migrations **in order** in your Supabase SQL Editor:

1. **First**: `20251226141000_init.sql` - Creates base tables (residentials, profiles, etc.)
2. **Second**: `20251226143000_residential_signup.sql` - Signup functions
3. **Third**: `20251228120000_owner_admin_access.sql` - Access control
4. **Fourth**: `20251228200000_add_amenities_and_unit_types.sql` - Amenities
5. **Fifth**: `20250101000001_create_unit_wizard_tables.sql` - **Unit wizard tables** ← This one is failing

### Option 3: Check If Tables Exist

Run this query in your Supabase SQL Editor to check what tables exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected tables from init migration**:
- `profiles`
- `platform_admins`
- `residentials` ← **This must exist**
- `residential_users`
- `units`
- `unit_members`

If these don't exist, run the **init.sql** migration first!

## After Successful Migration

Once all migrations run successfully, you need to **generate TypeScript types**:

```bash
# Generate types from your database schema
supabase gen types typescript --local > src/types/database.types.ts

# Or for hosted project
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.types.ts
```

## Verify Tables Were Created

After running the unit wizard migration, check these new tables exist:

```sql
-- Check new tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('unit_types', 'locations', 'addon_types', 'addons', 'unit_addons')
ORDER BY table_name;
```

You should see:
- ✅ `addon_types`
- ✅ `addons`
- ✅ `locations`
- ✅ `unit_addons`
- ✅ `unit_types`

## Troubleshooting

### If init tables don't exist:

1. **Check Supabase connection**:
   ```bash
   supabase status
   ```

2. **Link to your project** (if not linked):
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

3. **Run migrations**:
   ```bash
   supabase db push
   ```

### If you see "functions don't exist" errors:

Some migrations depend on helper functions. Make sure you run migrations **in chronological order** by filename.

### If you need to start fresh:

```bash
# CAUTION: This will delete all data!
supabase db reset

# Then apply all migrations
supabase db push
```

## Quick Check Script

Run this to see what's missing:

```sql
-- Check base tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'residentials') THEN
    RAISE NOTICE '❌ residentials table missing - run init migration first!';
  ELSE
    RAISE NOTICE '✅ residentials table exists';
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'units') THEN
    RAISE NOTICE '❌ units table missing - run init migration first!';
  ELSE
    RAISE NOTICE '✅ units table exists';
  END IF;
END $$;
```

## Summary

**The fix**: Run all migrations in chronological order, starting with `20251226141000_init.sql`.

The unit wizard migration **requires** these base tables to exist first:
- `residentials` (from init)
- `units` (from init)
- `residential_users` (from init)

Once the base tables exist, the unit wizard migration will run successfully! 🚀
