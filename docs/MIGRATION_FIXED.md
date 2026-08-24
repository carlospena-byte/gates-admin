# Database Migration Fix - December 28, 2025

## Problem

The database migration for amenities and unit types was failing with the error:
```
ERROR: relation "public.units" does not exist (SQLSTATE 42P01)
```

## Root Cause

The migration file was named `20250101000000_add_amenities_and_unit_types.sql` which placed it **before** the initialization migration that creates the base tables.

Migration files run in chronological order by filename:
- `20250101000000_*` (January 1, 2025) - **This ran FIRST** ❌
- `20251226141000_init.sql` (December 26, 2025) - This should run first ✅

## Solution

### 1. Renamed Migration File
```bash
# From:
20250101000000_add_amenities_and_unit_types.sql

# To:
20251228200000_add_amenities_and_unit_types.sql
```

This ensures migrations run in the correct order:
1. `20251226141000_init.sql` - Creates base tables (units, residentials, etc.)
2. `20251226143000_residential_signup.sql` - Adds signup functionality
3. `20251228120000_owner_admin_access.sql` - Adds owner admin access
4. `20251228200000_add_amenities_and_unit_types.sql` - Adds amenities and unit types ✅

### 2. Reset Database
```bash
supabase db reset --workdir .
```

This applies all migrations in the correct order.

### 3. Regenerated TypeScript Types
```bash
npx supabase gen types typescript --local > src/types/database.types.ts
```

This generates types including the new `amenities` table and `unit_type` column on the `units` table.

### 4. Fixed Type Definitions

The generated file already includes `Tables`, `TablesInsert`, and `TablesUpdate` helper types from Supabase CLI, so we only added convenience type aliases:

```typescript
// Specific table types
export type Amenity = Tables<'amenities'>
export type AmenityBooking = Tables<'amenity_bookings'>
export type InsertAmenity = TablesInsert<'amenities'>
export type UpdateAmenity = TablesUpdate<'amenities'>
```

## What's Now Available

### New Database Tables

1. **`amenities`** - Shared facilities and services
   - id, residential_id, name, description
   - is_active, location, capacity, requires_booking
   - Full RLS policies for residential members and admins

2. **`amenity_bookings`** - Amenity reservations (for future use)
   - id, amenity_id, residential_id, user_id
   - start_time, end_time, status, notes
   - Full RLS policies

### Updated Tables

1. **`units`** - Now has `unit_type` column
   - Accepts: 'apartment', 'house', 'townhouse', 'studio'
   - Database constraint enforces valid values

## New Dashboard Features

The improved residential dashboard ([ResidentialDashboardPage.improved.tsx](src/pages/ResidentialDashboardPage.improved.tsx)) now has access to:

✅ Unit types with color-coded badges
✅ Amenities management with CRUD operations
✅ Professional UI with shadcn components
✅ Stats overview cards
✅ Service layer integration

## Migration Files in Order

```
supabase/migrations/
├── 20251226141000_init.sql                          # Base schema
├── 20251226143000_residential_signup.sql            # Signup flow
├── 20251228120000_owner_admin_access.sql            # Owner access
└── 20251228200000_add_amenities_and_unit_types.sql  # Amenities & unit types ✅
```

## Verification

Build is now successful:
```bash
npm run build
# ✓ built in 3.78s
```

## Next Steps

To use the improved dashboard with amenities:

```bash
# Backup current dashboard
mv src/pages/ResidentialDashboardPage.tsx src/pages/ResidentialDashboardPage.old.tsx

# Use improved version
mv src/pages/ResidentialDashboardPage.improved.tsx src/pages/ResidentialDashboardPage.tsx

# Start development server
npm run dev
```

Then you can:
- Create units with types (Apartment, House, Townhouse, Studio)
- Manage amenities (Swimming Pool, Gym, etc.)
- Toggle active/inactive status
- See stats overview

## Files Modified

1. ✅ Renamed: `supabase/migrations/20251228200000_add_amenities_and_unit_types.sql`
2. ✅ Regenerated: `src/types/database.types.ts`
3. ✅ Updated: Added helper type aliases for amenities

## Status

✅ **All migrations applied successfully**
✅ **TypeScript types regenerated**
✅ **Build passing**
✅ **Ready for development**
