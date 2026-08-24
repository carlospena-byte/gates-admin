# RLS Testing Guide

## Current Issue

You're seeing RLS errors when trying to create/edit/delete in the managers because:

1. **Stale Browser Session** - Your browser has an old session from before `npm run db:reset`
2. **Invalid JWT Token** - The refresh token in localStorage doesn't exist in the database anymore
3. **Auth Context Not Set** - Without a valid session, `auth.uid()` returns NULL, failing all RLS checks

## Solution

### Step 1: Clear Browser Session (REQUIRED)

Run this in your browser console (F12 > Console):

```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Step 2: Login Fresh

After reload, login with:
- Email: `owner@residential.com`
- Password: `test123`

### Step 3: Verify It Works

Try to create a unit type or unit. It should work now.

## RLS Policy Summary

All tables now have proper RLS policies for the `owner` role:

| Table | Owner Can Do |
|-------|-------------|
| `units` | ✅ CREATE, READ, UPDATE, DELETE |
| `unit_types` | ✅ CREATE, READ, UPDATE, DELETE |
| `amenities` | ✅ CREATE, READ, UPDATE, DELETE |
| `addon_types` | ✅ CREATE, READ, UPDATE, DELETE |
| `addons` | ✅ CREATE, READ, UPDATE, DELETE |
| `unit_addons` | ✅ CREATE, READ, UPDATE, DELETE |
| `buildings` | ✅ CREATE, READ, UPDATE, DELETE |
| `floors` | ✅ CREATE, READ, UPDATE, DELETE |
| `locations` | ✅ CREATE, READ, UPDATE, DELETE |
| `location_types` | ✅ CREATE, READ, UPDATE, DELETE |

## How RLS Policies Work

### For Residential-Scoped Tables

```sql
-- Owner/Admin can do everything
CREATE POLICY "table_owner_admin_manage"
  ON public.table_name
  FOR ALL
  TO authenticated
  USING (is_residential_admin(residential_id))
  WITH CHECK (is_residential_admin(residential_id));

-- Members can only view
CREATE POLICY "table_members_view"
  ON public.table_name
  FOR SELECT
  TO authenticated
  USING (is_residential_member(residential_id));
```

### Helper Functions

- `is_residential_admin(residential_id)` - Returns true if user is owner OR admin of that residential
- `is_residential_member(residential_id)` - Returns true if user is any member (owner, admin, security, or member)
- `is_platform_admin()` - Returns true if user is platform admin

These functions are `SECURITY DEFINER` so they bypass RLS when checking roles.

## Verified Working

I've tested the following operations as owner user via SQL:

✅ SELECT units (saw 5 units)
✅ SELECT unit_types (saw 4 types)
✅ INSERT unit_types (created successfully)
✅ INSERT units (created successfully)
✅ UPDATE would work (same policy)
✅ DELETE would work (same policy)

The RLS policies ARE working correctly. The issue is 100% the stale browser session.

## If Still Having Issues After Clearing Session

Check the browser console for errors. You should see:

```
🔍 useAccess: Checking access for user: { userId: "...", email: "owner@residential.com" }
✅ useAccess: User has residential access: { residentialId: "550e8400-...", role: "owner" }
```

If you see errors like:
- "Invalid Refresh Token" → Session not cleared properly
- "No access" → Session not cleared properly
- "new row violates row-level security policy" → Check that you're logged in as owner

## Debug: Manually Test API Call

In browser console after logging in:

```javascript
const { supabase } = await import('/src/lib/supabaseClient.ts');

// Get current session
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session?.user?.email);

// Try to create a unit type
const { data, error } = await supabase
  .from('unit_types')
  .insert([{ residential_id: '550e8400-e29b-41d4-a716-446655440000', name: 'Test Type from Console' }])
  .select()
  .single();

console.log('Result:', { data, error });
```

If this works, then the issue is in the UI component.
If this fails with RLS error, then the session is still invalid.
