# Unit Creation Wizard - Complete CRUD System

## Overview

A comprehensive multi-step wizard for creating units with full CRUD operations for:
- **Unit Types** - Categorize units (Apartment, House, etc.)
- **Locations** - Block/Building and Street/Floor
- **Addon Types** - Categories for addons (Parking, Storage, etc.)
- **Addons** - Individual addons with types

## Database Schema

### New Tables Created

1. **`unit_types`** - Unit type categories
   - `id` - UUID primary key
   - `residential_id` - FK to residentials
   - `name` - Type name
   - `is_active` - Status switch
   - Unique constraint on (residential_id, name)

2. **`locations`** - Unit locations
   - `id` - UUID primary key
   - `residential_id` - FK to residentials
   - `block_or_building` - Block or Building name
   - `street_or_floor` - Street or Floor name
   - `is_active` - Status switch
   - Unique constraint on (residential_id, block_or_building, street_or_floor)

3. **`addon_types`** - Addon categories
   - `id` - UUID primary key
   - `residential_id` - FK to residentials
   - `name` - Type name
   - `is_active` - Status switch
   - Unique constraint on (residential_id, name)

4. **`addons`** - Individual addons
   - `id` - UUID primary key
   - `residential_id` - FK to residentials
   - `addon_type_id` - FK to addon_types
   - `name` - Addon name
   - `is_active` - Status switch
   - Unique constraint on (residential_id, name)

5. **`unit_addons`** - Junction table (many-to-many)
   - `id` - UUID primary key
   - `unit_id` - FK to units
   - `addon_id` - FK to addons
   - Unique constraint on (unit_id, addon_id)

### Updated Tables

**`units` table** modifications:
- Removed: `unit_type` (text column)
- Added: `unit_type_id` - FK to unit_types
- Added: `location_id` - FK to locations

## Migration

Run the migration file to create all tables:

```bash
# Migration file location
supabase/migrations/20250101000001_create_unit_wizard_tables.sql
```

**Migration includes:**
- ✅ All table creation
- ✅ RLS policies for all tables
- ✅ Indexes for performance
- ✅ Updated_at triggers
- ✅ Proper foreign key constraints

## TypeScript Types

Located in: [src/types/unit-wizard.types.ts](src/types/unit-wizard.types.ts)

```typescript
export interface UnitType {
  id: string;
  residential_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  residential_id: string;
  block_or_building: string;
  street_or_floor: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AddonType {
  id: string;
  residential_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Addon {
  id: string;
  residential_id: string;
  addon_type_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  addon_types?: AddonType;
}

export interface UnitWizardFormData {
  name: string;
  unit_type_id: string;
  location_id: string;
  addon_ids: string[];
  owner_id?: string;
  is_active: boolean;
}
```

## Service Layer

All services follow the same pattern with full CRUD:

### 1. Unit Type Service
[src/services/unitTypeService.ts](src/services/unitTypeService.ts)

```typescript
import { unitTypeService } from '@/services';

// List all unit types
await unitTypeService.list(residentialId);

// Get by ID
await unitTypeService.getById(id);

// Create
await unitTypeService.create({
  residential_id: residentialId,
  name: "Apartment",
  is_active: true
});

// Update
await unitTypeService.update(id, { name: "Updated Name" });

// Delete
await unitTypeService.delete(id);

// Toggle active status
await unitTypeService.toggleActive(id, currentStatus);
```

### 2. Location Service
[src/services/locationService.ts](src/services/locationService.ts)

```typescript
import { locationService } from '@/services';

// List all locations
await locationService.list(residentialId);

// Create
await locationService.create({
  residential_id: residentialId,
  block_or_building: "Block A",
  street_or_floor: "Floor 1",
  is_active: true
});

// Update, Delete, Toggle - same pattern as unit types
```

### 3. Addon Type Service
[src/services/addonTypeService.ts](src/services/addonTypeService.ts)

```typescript
import { addonTypeService } from '@/services';

// List all addon types
await addonTypeService.list(residentialId);

// Create
await addonTypeService.create({
  residential_id: residentialId,
  name: "Parking",
  is_active: true
});

// Update, Delete, Toggle - same pattern as unit types
```

### 4. Addon Service
[src/services/addonService.ts](src/services/addonService.ts)

```typescript
import { addonService } from '@/services';

// List all addons (with addon type info)
await addonService.list(residentialId);

// List by addon type
await addonService.listByType(addonTypeId);

// Create
await addonService.create({
  residential_id: residentialId,
  addon_type_id: addonTypeId,
  name: "Covered Parking",
  is_active: true
});

// Update, Delete, Toggle - same pattern as unit types
```

## Wizard Component

Location: [src/components/UnitWizard.tsx](src/components/UnitWizard.tsx)

### Features

**4-Step Wizard:**
1. **Step 1**: Basic Info & Unit Type
   - Unit name input
   - Unit type selection
   - CRUD for unit types inline

2. **Step 2**: Location
   - Location selection
   - CRUD for locations inline

3. **Step 3**: Addons (Optional)
   - Multiple addon selection
   - CRUD for addon types inline
   - CRUD for addons inline

4. **Step 4**: Review & Confirm
   - Summary of all selections
   - Status toggle
   - Final confirmation

### Wizard Usage

```typescript
import { UnitWizard } from '@/components/UnitWizard';

function YourComponent() {
  const [wizardOpen, setWizardOpen] = useState(false);

  const handleSuccess = () => {
    // Refresh your unit list
    refetchUnits();
  };

  return (
    <>
      <Button onClick={() => setWizardOpen(true)}>
        Create Unit
      </Button>

      <UnitWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        residentialId={residentialId}
        onSuccess={handleSuccess}
      />
    </>
  );
}
```

### Inline CRUD Features

Each step includes inline CRUD operations:

**Unit Types (Step 1):**
- ➕ Add new unit type
- ✏️ Toggle active/inactive status
- 🗑️ Delete unit type
- ✅ Select unit type

**Locations (Step 2):**
- ➕ Add new location (Block/Building + Street/Floor)
- ✏️ Toggle active/inactive status
- 🗑️ Delete location
- ✅ Select location

**Addon Types (Step 3):**
- ➕ Add new addon type
- ✏️ Toggle active/inactive status
- 🗑️ Delete addon type

**Addons (Step 3):**
- ➕ Add new addon with type
- ✏️ Toggle active/inactive status
- 🗑️ Delete addon
- ☑️ Multi-select addons

### Progress Indicator

Visual progress bar showing:
- ✅ Completed steps (green checkmark)
- 🔵 Current step (highlighted)
- ⚪ Pending steps (gray)

### Validation

- **Step 1**: Requires unit name and unit type
- **Step 2**: Requires location selection
- **Step 3**: Optional (can skip)
- **Step 4**: Review all selections

### Error Handling

- Shows validation errors
- Prevents navigation without required fields
- Loading states for all async operations
- Error messages for failed operations

## Integration Example

Update your dashboard to use the wizard:

```typescript
// In ResidentialDashboardPage.tsx

import { UnitWizard } from '@/components/UnitWizard';

// Add state
const [createUnitOpen, setCreateUnitOpen] = useState(false);

// Replace old unit creation dialog with wizard
<UnitWizard
  open={createUnitOpen}
  onOpenChange={setCreateUnitOpen}
  residentialId={residentialId}
  onSuccess={refetchUnits}
/>
```

## UI/UX Features

### Visual Design
- Clean, modern interface
- Step-by-step guidance
- Clear visual feedback
- Hover states and transitions
- Responsive layout

### Accessibility
- Keyboard navigation
- Focus management
- ARIA labels
- Screen reader support

### User Experience
- Progress tracking
- Back/Next navigation
- Inline creation (no context switching)
- Real-time updates
- Confirmation before submission

## Benefits

### For Administrators
- ✅ **Comprehensive**: Manage all unit-related data in one place
- ✅ **Fast**: Create units with all details in 4 steps
- ✅ **Flexible**: Create new types/locations/addons on-the-fly
- ✅ **Visual**: Clear progress and review step
- ✅ **Safe**: Validation and confirmation

### For Developers
- ✅ **Modular**: Separate services for each entity
- ✅ **Type-safe**: Full TypeScript support
- ✅ **Reusable**: Services can be used anywhere
- ✅ **Testable**: Clear separation of concerns
- ✅ **Scalable**: Easy to extend with new features

## Files Created/Modified

### New Files
1. ✅ `supabase/migrations/20250101000001_create_unit_wizard_tables.sql`
2. ✅ `src/types/unit-wizard.types.ts`
3. ✅ `src/services/unitTypeService.ts`
4. ✅ `src/services/locationService.ts`
5. ✅ `src/services/addonTypeService.ts`
6. ✅ `src/services/addonService.ts`
7. ✅ `src/components/UnitWizard.tsx`

### Modified Files
1. ✅ `src/services/index.ts` - Export new services

## Next Steps

1. **Run Migration**
   ```bash
   # Apply the migration to your Supabase project
   supabase db push
   ```

2. **Update Dashboard**
   - Replace old unit creation with wizard
   - Import and use UnitWizard component

3. **Test Wizard**
   - Test all 4 steps
   - Test inline CRUD operations
   - Test validation
   - Test unit creation

4. **Optional Enhancements**
   - Add owner selection in wizard
   - Add bulk unit creation
   - Add import from CSV
   - Add unit templates

## Example Workflow

### Creating a Unit

1. **Click "Add Unit"** button
2. **Step 1**:
   - Enter unit name: "Apartment 101"
   - Click "+ Add Type" → Create "Apartment"
   - Select "Apartment" type
   - Click "Next"

3. **Step 2**:
   - Click "+ Add Location"
   - Enter Block: "Block A"
   - Enter Floor: "Floor 1"
   - Click "Add Location"
   - Select the created location
   - Click "Next"

4. **Step 3**:
   - Click "+ Add Type" → Create "Parking"
   - Click "+ Add Addon" → Create "Covered Parking" with type "Parking"
   - Select "Covered Parking" addon
   - Click "Next"

5. **Step 4**:
   - Review all selections
   - Toggle status if needed
   - Click "Create Unit"

Done! Unit created with all relationships.

## Troubleshooting

### Migration Errors

If migration fails:
1. Check Supabase connection
2. Verify RLS is enabled
3. Check for existing tables with same names
4. Run migrations in correct order

### CRUD Not Working

If CRUD operations fail:
1. Check RLS policies
2. Verify user has admin role
3. Check foreign key constraints
4. Verify residential_id is correct

### Wizard Issues

If wizard has issues:
1. Check all services are imported
2. Verify residentialId is passed correctly
3. Check console for errors
4. Verify data is loading

## Status

✅ **Ready for Testing**
- All database schema created
- All services implemented
- Wizard component complete
- Full CRUD functionality
- Progress tracking
- Validation
- Error handling

**Build Status**: Ready (migration needs to be run first)
