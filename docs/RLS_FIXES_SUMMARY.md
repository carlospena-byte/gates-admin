# RLS Fixes Summary - December 31, 2024

## Issues Fixed

### 1. Infinite Recursion in RLS Helper Functions ✅
**Migration**: `20251231200000_fix_infinite_recursion_in_rls_helpers.sql`

**Problem**:
- Helper functions (`is_residential_owner`, `is_residential_admin`, etc.) were querying tables with RLS policies
- Those RLS policies called the same helper functions
- This created infinite recursion loops causing "stack depth limit exceeded" errors

**Solution**:
- Made all RLS helper functions `SECURITY DEFINER`
- This allows them to bypass RLS when checking roles
- Functions affected:
  - `is_platform_admin()`
  - `is_residential_owner(residential_id)`
  - `is_residential_admin(residential_id)`
  - `is_residential_member(residential_id)`

### 2. Missing RLS Policies on Critical Tables ✅
**Migration**: `20251231210000_fix_all_missing_rls_policies.sql`

**Problem**:
- Tables had RLS **enabled** but **zero policies**, blocking ALL operations
- Affected tables:
  - `unit_types` - 0 policies
  - `amenities` - 0 policies
  - `addon_types` - 0 policies
  - `addons` - 0 policies
  - `unit_addons` - 0 policies
  - `buildings` - 0 policies
  - `floors` - 0 policies

**Solution**:
Added 4 policies per table following the role hierarchy:

1. **Platform Admin** - Full access to all data
2. **Owner** - Full access to their residential's data
3. **Admin** - Full access to their residential's data
4. **Member/Security** - Read-only access to their residential's data

**Policy Pattern**:
```sql
-- Example for unit_types
CREATE POLICY "unit_types_platform_admin_all"
  ON public.unit_types FOR ALL TO authenticated
  USING (is_platform_admin());

CREATE POLICY "unit_types_owner_all"
  ON public.unit_types FOR ALL TO authenticated
  USING (is_residential_owner(residential_id));

CREATE POLICY "unit_types_admin_all"
  ON public.unit_types FOR ALL TO authenticated
  USING (is_residential_admin(residential_id));

CREATE POLICY "unit_types_member_view"
  ON public.unit_types FOR SELECT TO authenticated
  USING (is_residential_member(residential_id));
```

### 3. Units Table Recreated with Clean Policies ✅
**Migration**: `20251231190000_recreate_units_from_scratch.sql`

**Problem**:
- Complex RLS policies with circular dependencies
- Inconsistent policy naming

**Solution**:
- Dropped and recreated units table
- Added 3 simple, explicit policies:
  - `units_platform_admin_all` - Platform admins
  - `units_owner_all` - Owners can manage all units
  - `units_admin_all` - Admins can manage all units
  - `units_member_view` - Members/Security can view units

### 4. Profiles Table RLS Fix ✅
**Migration**: `20251231180000_fix_profiles_rls_for_residential_access.sql`

**Problem**:
- `profiles` table only allowed users to view their own profile
- `unitService.listByResidential()` needed to fetch owner emails
- This was blocked by RLS

**Solution**:
- Added `profiles: residential members view` policy
- Allows members of the same residential to see each other's profiles
- Added `profiles: platform admin all` policy

## Current RLS Policy Counts

| Table | Policies | Status |
|-------|----------|--------|
| `unit_types` | 4 | ✅ Fixed |
| `amenities` | 4 | ✅ Fixed |
| `addon_types` | 4 | ✅ Fixed |
| `addons` | 4 | ✅ Fixed |
| `unit_addons` | 4 | ✅ Fixed |
| `buildings` | 4 | ✅ Fixed |
| `floors` | 4 | ✅ Fixed |
| `locations` | 4 | ✅ Working |
| `units` | 3 | ✅ Fixed |
| `residential_users` | 5 | ✅ Working |
| `profiles` | 4 | ✅ Fixed |
| `residentials` | 3 | ✅ Working |

## Seed Data Improvements ✅

**File**: `supabase/seed.sql`

### Added:
1. **Sample Units** - 5 units created automatically
   - Units 101, 102 owned by owner user
   - Units 201, 202 unassigned
   - Unit 301 owned by admin user

2. **All Auth Token Fields** - Prevents NULL conversion errors
   - `confirmation_token`, `recovery_token`, `email_change`, etc.
   - All set to empty strings instead of NULL

3. **Embedded User Creation** - Users created directly in SQL
   - No dependency on external scripts
   - Survives database resets
   - Creates: platformadmin, owner, admin, security users

## Testing Instructions

### 1. Clear Browser Session
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### 2. Login with Test Credentials
- **Owner**: `owner@residential.com` / `test123`
- **Admin**: `admin@residential.com` / `test123`
- **Security**: `security@residential.com` / `test123`
- **Platform Admin**: `platformadmin@example.com` / `test123`

### 3. Verify Functionality
- ✅ Dashboard loads without "No access" error
- ✅ Can see 5 units in units table
- ✅ Can create new units
- ✅ Can manage unit types, amenities, addons
- ✅ All CRUD operations work

## Future Maintenance

Every `npm run db:reset` will now:
1. Apply all migrations including RLS fixes
2. Create test users automatically
3. Seed sample data (units, unit types, amenities, buildings, floors)
4. No manual intervention needed

## Files Modified

1. `/supabase/migrations/20251231180000_fix_profiles_rls_for_residential_access.sql`
2. `/supabase/migrations/20251231190000_recreate_units_from_scratch.sql`
3. `/supabase/migrations/20251231200000_fix_infinite_recursion_in_rls_helpers.sql`
4. `/supabase/migrations/20251231210000_fix_all_missing_rls_policies.sql`
5. `/supabase/seed.sql` - Added sample units and fixed schema alignment

## Debug Logging Added

Added comprehensive debug logging to track issues:
- `useAccess` hook logs access checks
- `App.tsx` logs session and access state
- `ResidentialDashboardPage` logs data fetching

These logs help diagnose future issues quickly.
