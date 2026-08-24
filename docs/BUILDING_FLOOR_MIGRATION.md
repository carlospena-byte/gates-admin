# Building & Floor Hierarchical Structure Migration

## Overview

This migration transforms the flat `locations` table into a two-level hierarchy with `buildings` and `floors`, eliminating data duplication and providing better organization.

## What Changed

### Before (Flat Structure)
```
locations
├── Building A - Floor 1
├── Building A - Floor 2
├── Building A - Floor 3
└── Building B - Floor 1
```
**Problem**: "Building A" is duplicated 3 times

### After (Hierarchical Structure)
```
buildings
├── Building A
│   ├── Floor 1
│   ├── Floor 2
│   └── Floor 3
└── Building B
    └── Floor 1
```
**Benefit**: "Building A" stored only once

## Database Schema

### New Tables

```sql
-- Parent table: Buildings/Blocks
buildings (
  id UUID PRIMARY KEY,
  residential_id UUID REFERENCES residentials(id),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(residential_id, name)
)

-- Child table: Floors/Streets
floors (
  id UUID PRIMARY KEY,
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(building_id, name)
)
```

### Units Table Updates

```sql
ALTER TABLE units
  ADD COLUMN building_id UUID REFERENCES buildings(id),
  ADD COLUMN floor_id UUID REFERENCES floors(id);
```

## Files Created/Modified

### New Files
1. **Migration**: `supabase/migrations/20251229200000_refactor_locations_to_hierarchical.sql`
2. **Services**:
   - `src/services/buildingService.ts`
   - `src/services/floorService.ts`
3. **Component**: `src/components/BuildingFloorManager.tsx`
4. **Types**: Updated `src/types/unit-wizard.types.ts`

### Modified Files
- `src/services/index.ts` - Export new services
- `src/types/unit-wizard.types.ts` - Add Building/Floor types

## TypeScript Types

```typescript
interface Building {
  id: string;
  residential_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Floor {
  id: string;
  building_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  buildings?: Building;  // Joined relation
}
```

## Services API

### Building Service
```typescript
buildingService.list(residentialId)              // List all buildings
buildingService.getById(id)                      // Get single building
buildingService.create({ residential_id, name }) // Create building
buildingService.update(id, { name })             // Update building
buildingService.delete(id)                       // Delete building
buildingService.toggleActive(id, currentStatus)  // Toggle active status
```

### Floor Service
```typescript
floorService.listByBuilding(buildingId)          // List floors in building
floorService.listByResidential(residentialId)    // List all floors
floorService.getById(id)                         // Get single floor
floorService.create({ building_id, name })       // Create floor
floorService.update(id, { name })                // Update floor
floorService.delete(id)                          // Delete floor
floorService.toggleActive(id, currentStatus)     // Toggle active status
```

## UI Component

The new `BuildingFloorManager` component provides:

- ✅ Hierarchical tree view of buildings and floors
- ✅ Expandable/collapsible buildings
- ✅ Inline creation of buildings and floors
- ✅ Edit/delete operations for both levels
- ✅ Active/inactive toggle for both levels
- ✅ Floor count badges
- ✅ Real-time updates

## Migration Process

The migration automatically:

1. Creates `buildings` and `floors` tables
2. Migrates existing `locations` data:
   - Extracts unique buildings
   - Creates floor entries
   - Preserves active status and timestamps
3. Updates `units` table with new `building_id` and `floor_id`
4. Preserves old `locations` table as backup
5. Sets up RLS policies
6. Creates indexes for performance

## Integration Guide

### Option 1: Use New Component (Recommended)

Replace `LocationManager` with `BuildingFloorManager`:

```tsx
import { BuildingFloorManager } from "@/components/BuildingFloorManager";

// In your component
<BuildingFloorManager
  open={buildingFloorManagerOpen}
  onOpenChange={setBuildingFloorManagerOpen}
  residentialId={residentialId}
/>
```

### Option 2: Keep Old Component

The old `LocationManager` still works with the legacy `locations` table. Both can coexist during transition.

## Benefits

### 1. No Data Duplication
- Building names stored once instead of per-floor
- Cleaner, normalized database

### 2. Better Organization
- Clear parent-child relationship
- Easier to understand and manage

### 3. Improved Operations
- Rename a building → updates everywhere
- Disable a building → affects all floors
- Bulk operations simplified

### 4. Better Reporting
- "Show all units in Building A" - simple query
- Building-level statistics
- Floor-level analytics

### 5. Scalability
- Easy to add building-level attributes (address, manager, etc.)
- Can add more levels if needed (zones, sections, etc.)

## Example Queries

### Get all units in a building
```typescript
const { data } = await supabase
  .from('units')
  .select('*, floors(*, buildings(*))')
  .eq('building_id', buildingId);
```

### Get buildings with floor count
```typescript
const { data } = await supabase
  .from('buildings')
  .select('*, floors(count)');
```

### Using the helper view
```sql
SELECT * FROM unit_locations
WHERE building_name = 'Building A';
```

## Rollback Plan

If needed, you can rollback by:

1. Keeping the `locations` table (not dropped in migration)
2. Reverting `units` table changes
3. Dropping new tables

```sql
-- Rollback (if needed)
ALTER TABLE units DROP COLUMN building_id, DROP COLUMN floor_id;
DROP TABLE floors CASCADE;
DROP TABLE buildings CASCADE;
```

## Testing Checklist

- [ ] Run migration on dev database
- [ ] Verify all existing locations migrated correctly
- [ ] Test building CRUD operations
- [ ] Test floor CRUD operations
- [ ] Test unit assignment to building/floor
- [ ] Verify RLS policies work correctly
- [ ] Check performance with many buildings/floors
- [ ] Test UI component functionality
- [ ] Verify old `LocationManager` still works (if keeping)

## Next Steps

1. Run migration: `supabase db push`
2. Update UI to use `BuildingFloorManager`
3. Update unit creation/edit forms to use building/floor dropdowns
4. Add building-level features (if desired)
5. Remove old `LocationManager` (optional)
6. Drop `locations` table after confirming migration success

## Support

The old `locations` table is kept as backup. You can continue using the old `LocationManager` component during transition. Both systems can run side-by-side.
