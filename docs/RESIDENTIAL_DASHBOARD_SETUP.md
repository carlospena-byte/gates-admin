# Residential Dashboard Setup Guide

## Overview

This guide explains how to set up the improved Residential Dashboard with Units, Users, and Amenities management.

## ✨ New Features

### 1. Units Management
- Create units with types: **Apartment**, **House**, **Townhouse**, **Studio**
- Toggle unit active/inactive status
- Visual badges for unit types with color coding
- Modern card-based UI

### 2. Users Management
- View all residential users
- Display user roles (Admin/Member)
- Badge indicators for role differentiation

### 3. Amenities Management
- Create shared facilities (Swimming Pool, Gym, Parking, etc.)
- Add descriptions for each amenity
- Toggle amenity availability
- Modern, responsive design

## 📋 Prerequisites

Before using the improved dashboard, you need to run the database migration to add the amenities table and unit_type column.

## 🚀 Setup Steps

### Step 1: Run the Database Migration

```bash
# Make sure your Supabase local instance is running
npm run dev

# In another terminal, apply the migration
supabase db reset --workdir .
```

Or manually run the migration SQL in your Supabase dashboard:

```sql
-- File: supabase/migrations/20250101000000_add_amenities_and_unit_types.sql
```

### Step 2: Regenerate TypeScript Types (Optional but Recommended)

```bash
# This will update types to include the new amenities table
npx supabase gen types typescript --local > src/types/database.types.ts
```

Then update the helper types at the bottom of `database.types.ts`:

```typescript
// Add these to the end of src/types/database.types.ts
export type Amenity = Tables<'amenities'>
export type AmenityBooking = Tables<'amenity_bookings'>
export type InsertAmenity = TablesInsert<'amenities'>
export type UpdateAmenity = TablesUpdate<'amenities'>
```

### Step 3: Install Dependencies (Already Done)

```bash
npm install @radix-ui/react-dialog @radix-ui/react-select
```

### Step 4: Use the Improved Dashboard

Replace the old dashboard:

```bash
mv src/pages/ResidentialDashboardPage.improved.tsx src/pages/ResidentialDashboardPage.tsx
```

Or keep both and import the improved one in your router.

## 📁 New Files Created

### Components
- `src/components/ui/dialog.tsx` - Modal dialogs for creating units/amenities
- `src/components/ui/select.tsx` - Dropdown select for unit types
- `src/components/ui/badge.tsx` - Visual badges for labels

### Services
- `src/services/amenities.service.ts` - Amenities CRUD operations
- Updated `src/services/index.ts` - Exports amenities service

### Types
- `src/types/amenities.types.ts` - TypeScript types for amenities and unit types

### Pages
- `src/pages/ResidentialDashboardPage.improved.tsx` - New dashboard (ready to use)

### Database
- `supabase/migrations/20250101000000_add_amenities_and_unit_types.sql` - Migration file

## 🎨 UI Improvements

### Before
- Basic table layout
- Two-column grid (Units | Unit Users)
- Simple text labels
- Basic loading states

### After
- **Beautiful card-based design** with gradient backgrounds
- **Three-section layout**: Units, Users, Amenities
- **Stats overview cards** showing totals at a glance
- **Color-coded badges** for unit types
- **Professional modals** for creating new items
- **Smooth hover effects** and transitions
- **Better loading states** with skeletons
- **Enhanced error handling** with alert components

## 🏗️ Architecture Improvements

### Uses New Service Layer
```typescript
// ✅ Clean service calls
const result = await unitService.create({
  residential_id: residentialId,
  name: "Unit 101",
  unit_type: "apartment"
});

if (result.success) {
  // Handle success
} else {
  // Handle error
}
```

### Uses Custom Hooks
```typescript
// ✅ Automatic data fetching with cleanup
const { data: units, isLoading, error, refetch } = useQuery(
  () => unitService.listByResidential(residentialId)
);
```

### Type Safety
```typescript
// ✅ Fully typed
type UnitType = 'apartment' | 'house' | 'townhouse' | 'studio';
```

## 📊 Database Schema

### Units Table (Updated)
```sql
create table public.units (
  id uuid primary key,
  residential_id uuid references residentials(id),
  name text not null,
  unit_type text check (unit_type in ('apartment', 'house', 'townhouse', 'studio')),
  owner_user_id uuid references profiles(user_id),
  is_active boolean default true,
  created_at timestamptz default now()
);
```

### Amenities Table (New)
```sql
create table public.amenities (
  id uuid primary key,
  residential_id uuid references residentials(id),
  name text not null,
  description text,
  is_active boolean default true,
  location text,
  capacity integer,
  requires_booking boolean default false,
  created_at timestamptz default now()
);
```

### Amenity Bookings (New - For Future Use)
```sql
create table public.amenity_bookings (
  id uuid primary key,
  amenity_id uuid references amenities(id),
  residential_id uuid references residentials(id),
  user_id uuid references profiles(user_id),
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text check (status in ('pending', 'confirmed', 'cancelled')),
  notes text,
  created_at timestamptz default now()
);
```

## 🎯 Usage Examples

### Creating a Unit
1. Click "Add Unit" button
2. Enter unit name (e.g., "Unit 101")
3. Select type from dropdown (Apartment, House, Townhouse, Studio)
4. Click "Create Unit"

### Creating an Amenity
1. Click the "+" button in the Amenities card
2. Enter amenity name (e.g., "Swimming Pool")
3. Optionally add a description
4. Click "Create Amenity"

### Toggle Active Status
- Simply click the switch next to any unit or amenity to activate/deactivate

## 🔐 Security

All tables have Row Level Security (RLS) enabled:

- **Residential admins** can manage units and amenities for their residential
- **Platform admins** have full access
- **Regular users** can view but not modify

## 🎨 Color Scheme

### Unit Type Colors
- 🏢 **Apartment**: Blue badge
- 🏠 **House**: Green badge
- 🏘️ **Townhouse**: Purple badge
- 🏙️ **Studio**: Orange badge

### Card Borders
- **Units**: Blue left border
- **Users**: Green left border
- **Amenities**: Purple left border

## 📱 Responsive Design

The dashboard is fully responsive:
- **Desktop**: 2-column layout for cards
- **Tablet**: Stacked layout with full-width cards
- **Mobile**: Single column, optimized touch targets

## ⚡ Performance

- **Automatic request cleanup** - No memory leaks
- **Optimistic updates** - Instant UI feedback
- **Efficient re-renders** - Only affected components update
- **Loading skeletons** - Better perceived performance

## 🐛 Troubleshooting

### "amenities table does not exist"
- Run the migration: `supabase db reset --workdir .`
- Or manually run the SQL in Supabase dashboard

### "unit_type does not exist in type"
- Regenerate TypeScript types from database
- The migration adds this column to the units table

### Dialog not showing
- Make sure `@radix-ui/react-dialog` is installed
- Check browser console for errors

## 🚦 Next Steps

After setup, consider:

1. **Add more unit types** - Edit migration to add custom types
2. **Amenity booking system** - Use the amenity_bookings table
3. **User invitations** - Add email invites for new users
4. **Advanced filtering** - Filter units by type, status, etc.
5. **Analytics dashboard** - Show occupancy rates, popular amenities

## 📚 Related Documentation

- [IMPROVEMENTS.md](IMPROVEMENTS.md) - Complete architecture documentation
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Quick code examples
- [IMPROVEMENT_SUMMARY.md](IMPROVEMENT_SUMMARY.md) - Summary of all changes

## ✅ Checklist

- [ ] Run database migration
- [ ] Regenerate TypeScript types (optional)
- [ ] Replace old dashboard file
- [ ] Test creating units
- [ ] Test creating amenities
- [ ] Test toggling active status
- [ ] Verify mobile responsiveness
- [ ] Check error handling

## 🎉 Done!

Your residential dashboard is now ready with modern UI and full functionality for managing units, users, and amenities!
