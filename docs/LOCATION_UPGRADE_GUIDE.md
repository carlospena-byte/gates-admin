# Location Manager Upgrade Guide

## Overview
The LocationManager component has been upgraded to support hierarchical locations with different types instead of the flat block/building + street/floor structure.

## Changes Made

### 1. Type Definitions Updated
**File:** `src/types/unit-wizard.types.ts`

The `Location` interface now supports:
- `name`: Single name field instead of two separate fields
- `type`: LocationType enum ('TOWER' | 'FLOOR' | 'POLYGON' | 'PASAJE' | 'STREET')
- `parent_id`: Optional reference to parent location for hierarchy
- `parent`: Optional nested parent location data
- `children`: Optional array of child locations

```typescript
export type LocationType = 'TOWER' | 'FLOOR' | 'POLYGON' | 'PASAJE' | 'STREET';

export interface Location {
  id: string;
  residential_id: string;
  name: string;
  type: LocationType;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  parent?: Location;
  children?: Location[];
}
```

### 2. LocationManager Component Rewritten
**File:** `src/components/LocationManager.tsx`

New features:
- Location type selector (Tower, Floor, Polygon, Pasaje, Street)
- Parent location selector for building hierarchies
- Wider sheet (`sm:max-w-2xl`) to accommodate additional fields
- Enhanced table with Type and Parent columns
- Inline editing for all fields including type and parent
- Smart parent selection (prevents circular references)

### 3. Location Service Updated
**File:** `src/services/locationService.ts`

- Updated all queries to include parent data using Supabase joins
- Changed from `block_or_building`, `street_or_floor` to `name`, `type`, `parent_id`
- All CRUD operations now support hierarchical structure

### 4. Database Migration Created
**File:** `supabase/migrations/20251230000000_refactor_locations_hierarchical.sql`

The migration:
- Creates backup of existing locations table
- Drops old locations table
- Creates new hierarchical locations table with type and parent_id
- Migrates existing data (converts old structure to new hierarchy)
- Sets up RLS policies
- Creates indexes for performance
- Adds helper view for location hierarchy visualization

## Steps to Deploy

### 1. Run Database Migration

```bash
# If using Supabase CLI locally
supabase db reset

# Or apply migration to remote database
supabase db push
```

### 2. Regenerate Supabase Types

After the migration runs, regenerate TypeScript types:

```bash
npm run update-types
```

This will update `src/types/supabase.ts` to match the new database schema.

### 3. Build and Test

```bash
npm run build
npm run dev
```

## Data Migration Details

The migration automatically converts old location data:
- `block_or_building` → Creates a TOWER type location as parent
- `street_or_floor` → Creates a FLOOR type location as child of the tower
- Maintains `is_active`, `created_at`, `updated_at` from original records
- Handles duplicates gracefully using unique constraints

## Location Hierarchy Examples

### Example 1: Tower with Floors
```
Tower A (TOWER, parent_id: null)
├── Floor 1 (FLOOR, parent_id: Tower A)
├── Floor 2 (FLOOR, parent_id: Tower A)
└── Floor 3 (FLOOR, parent_id: Tower A)
```

### Example 2: Complex Residential Structure
```
Polygon A (POLYGON, parent_id: null)
├── Pasaje 1 (PASAJE, parent_id: Polygon A)
│   ├── Tower 1 (TOWER, parent_id: Pasaje 1)
│   │   ├── Floor 1 (FLOOR, parent_id: Tower 1)
│   │   └── Floor 2 (FLOOR, parent_id: Tower 1)
│   └── Tower 2 (TOWER, parent_id: Pasaje 1)
│       └── Floor 1 (FLOOR, parent_id: Tower 2)
└── Pasaje 2 (PASAJE, parent_id: Polygon A)
    └── Street A (STREET, parent_id: Pasaje 2)
```

## Features

### Create Location
1. Enter location name
2. Select type (Tower, Floor, Polygon, Pasaje, Street)
3. Optionally select parent location
4. Click "Add Location"

### Edit Location
1. Click edit icon on any location
2. Modify name, type, or parent
3. Click "Save" or press Enter

### Delete Location
- Click trash icon
- Confirm deletion in toast notification
- Note: Deleting a parent location cascades to children (database constraint)

### Toggle Active Status
- Use switch in Active column
- Immediately updates status

## Pagination & Sorting
- 10 items per page
- Sort by name or type
- Search/filter (can be added later)

## UI Improvements
- Wider sheet for better visibility of all fields
- Type badges/labels for easy identification
- Parent location displayed in dedicated column
- Inline editing for seamless UX
- Clear visual hierarchy

## Future Enhancements (Optional)
1. Tree view visualization of hierarchy
2. Drag-and-drop to reorganize hierarchy
3. Bulk operations (create multiple floors at once)
4. Search/filter by type or parent
5. Icons for each location type
6. Breadcrumb navigation in parent selector
7. Validation rules (e.g., FLOOR must have TOWER parent)

## Rollback Plan

If issues occur, rollback by:
1. Restore from `locations_backup` table
2. Revert type definitions
3. Restore old LocationManager component
4. Restore old locationService

## Notes
- The old `locations` table is backed up as `locations_backup` before migration
- Units table keeps `location_id` reference (should point to leaf level locations)
- RLS policies ensure users can only access locations for their residential
- Only admins can create/update/delete locations
