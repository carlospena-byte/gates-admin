# Manager Components Improvements

## Summary

This document outlines the improvements made to all manager components (Unit Types, Locations, Addons, Addon Types, Buildings/Floors) to add pagination, sorting, item counts, and styled switches.

## ✅ Completed

### 1. Hierarchical Building/Floor Structure
- ✅ Created database migration for `buildings` and `floors` tables
- ✅ Created TypeScript types for Building and Floor
- ✅ Created `buildingService` and `floorService`
- ✅ Created `BuildingFloorManager` component with hierarchical UI
- ✅ Documentation in `BUILDING_FLOOR_MIGRATION.md`

### 2. Manager Components Refactoring
- ✅ Fixed all manager components to use manual state management
- ✅ Eliminated `useQuery` issues with data persistence
- ✅ Each manager now loads data reliably on open

### 3. Reusable Utilities Created
- ✅ **`usePaginatedSortedData` hook** - Reusable pagination and sorting logic
- ✅ **`Pagination` component** - Smart pagination with ellipsis for many pages
- ✅ **`SortableTableHead` component** - Clickable table headers with sort indicators

### 4. Switch Component
- ✅ Already uses `bg-primary` when active (main color applied automatically)

## 📋 To Complete

### Apply Improvements to All Managers

You need to update each manager component to use the new utilities:

#### Files to Update:
1. ✅ `src/components/UnitTypeManager.tsx` - **PARTIALLY DONE** (has sorting/pagination logic, needs to use reusable components)
2. ⏳ `src/components/LocationManager.tsx`
3. ⏳ `src/components/AddonTypeManager.tsx`
4. ⏳ `src/components/AddonManager.tsx`
5. ⏳ `src/components/BuildingFloorManager.tsx` (if keeping it)

## Implementation Guide

### Step 1: Update Imports

```typescript
import { Pagination } from "@/components/Pagination";
import { SortableTableHead } from "@/components/SortableTableHead";
import { usePaginatedSortedData } from "@/hooks/usePaginatedSortedData";
```

### Step 2: Remove Manual Pagination/Sorting State

**Remove:**
```typescript
const [currentPage, setCurrentPage] = useState(1);
const [itemsPerPage] = useState(10);
const [sortField, setSortField] = useState<SortField>("name");
const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

// Remove manual sorting logic
const sortedUnitTypes = [...unitTypes].sort((a, b) => {
  // ... manual sorting code
});

// Remove manual pagination logic
const totalItems = sortedUnitTypes.length;
const totalPages = Math.ceil(totalItems / itemsPerPage);
const paginatedUnitTypes = sortedUnitTypes.slice(startIndex, endIndex);
```

**Replace with:**
```typescript
const {
  paginatedData: paginatedUnitTypes,
  totalItems,
  totalPages,
  startIndex,
  endIndex,
  sortField,
  sortOrder,
  handleSort,
  currentPage,
  setCurrentPage,
  resetPage,
} = usePaginatedSortedData({
  data: unitTypes,
  defaultSortField: "name" as keyof UnitType,
  itemsPerPage: 10,
});
```

### Step 3: Call `resetPage()` on Data Load

```typescript
const loadUnitTypes = async () => {
  setIsLoading(true);
  setError(null);
  const result = await unitTypeService.list(residentialId);
  setIsLoading(false);

  if (result.success) {
    setUnitTypes(result.data);
    resetPage(); // Reset to first page when data loads
  } else {
    setError(result.error.message);
  }
};
```

### Step 4: Update Table Headers

**Replace:**
```typescript
<TableHead className="w-full cursor-pointer hover:bg-muted/50" onClick={() => handleSort("name")}>
  <div className="flex items-center gap-1">
    Name
    {sortField === "name" && (
      <span className="text-xs">{sortOrder === "asc" ? "↑" : "↓"}</span>
    )}
  </div>
</TableHead>
```

**With:**
```typescript
<SortableTableHead
  field="name"
  currentSortField={sortField}
  sortOrder={sortOrder}
  onSort={handleSort}
  className="w-full"
>
  Name
</SortableTableHead>
```

### Step 5: Add Item Count to Label

```typescript
<div className="flex items-center justify-between">
  <label className="text-sm font-medium">
    Existing Unit Types
    {totalItems > 0 && (
      <span className="ml-2 text-muted-foreground">({totalItems} total)</span>
    )}
  </label>
</div>
```

### Step 6: Replace Manual Pagination with Component

**Replace:**
```typescript
{totalPages > 1 && (
  <div className="flex items-center justify-between px-2 py-3 border-t">
    <div className="text-sm text-muted-foreground">
      Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems}
    </div>
    <div className="flex gap-2">
      <Button ... >Previous</Button>
      {/* Page number buttons */}
      <Button ... >Next</Button>
    </div>
  </div>
)}
```

**With:**
```typescript
<Pagination
  currentPage={currentPage}
  totalPages={totalPages}
  totalItems={totalItems}
  startIndex={startIndex}
  endIndex={endIndex}
  onPageChange={setCurrentPage}
/>
```

### Step 7: Wrap Table in Fragment

```typescript
{unitTypes && unitTypes.length > 0 ? (
  <>
    <div className="rounded-lg border bg-card">
      <Table>
        {/* ... table content ... */}
      </Table>
    </div>

    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={totalItems}
      startIndex={startIndex}
      endIndex={endIndex}
      onPageChange={setCurrentPage}
    />
  </>
) : (
  <div className="text-center py-8 text-sm text-muted-foreground">
    No unit types yet. Create one above.
  </div>
)}
```

## Example: Complete UnitTypeManager Pattern

```typescript
export function UnitTypeManager({ open, onOpenChange, residentialId }: UnitTypeManagerProps) {
  // Data fetching state
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use pagination & sorting hook
  const {
    paginatedData: paginatedUnitTypes,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    sortField,
    sortOrder,
    handleSort,
    currentPage,
    setCurrentPage,
    resetPage,
  } = usePaginatedSortedData({
    data: unitTypes,
    defaultSortField: "name" as keyof UnitType,
    itemsPerPage: 10,
  });

  // Form state
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load data when sheet opens
  useEffect(() => {
    if (open) {
      loadUnitTypes();
    }
  }, [open, residentialId]);

  const loadUnitTypes = async () => {
    setIsLoading(true);
    setError(null);
    const result = await unitTypeService.list(residentialId);
    setIsLoading(false);

    if (result.success) {
      setUnitTypes(result.data);
      resetPage();
    } else {
      setError(result.error.message);
    }
  };

  // ... other handlers (create, update, delete, toggle) ...

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Manage Unit Types</SheetTitle>
          <SheetDescription>
            Create and manage unit type categories (Apartment, House, etc.)
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-6">
          {/* Create Form */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Add New Unit Type</label>
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Apartment, House, Studio..."
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                disabled={isSubmitting}
              />
              <Button onClick={handleCreate} disabled={isSubmitting || !newName.trim()}>
                {isSubmitting ? <Spinner size="sm" /> : <PlusIcon />}
              </Button>
            </div>
          </div>

          {submitError && (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {/* List with pagination & sorting */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Existing Unit Types
                {totalItems > 0 && (
                  <span className="ml-2 text-muted-foreground">({totalItems} total)</span>
                )}
              </label>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner />
              </div>
            ) : unitTypes && unitTypes.length > 0 ? (
              <>
                <div className="rounded-lg border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <SortableTableHead
                          field="name"
                          currentSortField={sortField}
                          sortOrder={sortOrder}
                          onSort={handleSort}
                          className="w-full"
                        >
                          Name
                        </SortableTableHead>
                        <SortableTableHead
                          field="is_active"
                          currentSortField={sortField}
                          sortOrder={sortOrder}
                          onSort={handleSort}
                          className="w-[120px]"
                        >
                          Status
                        </SortableTableHead>
                        <TableHead className="w-[110px]">Active</TableHead>
                        <TableHead className="w-[140px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedUnitTypes.map((type) => (
                        <TableRow key={type.id}>
                          {/* ... table cells ... */}
                          <TableCell>
                            <Switch
                              checked={type.is_active}
                              onCheckedChange={() => handleToggleActive(type.id, type.is_active)}
                              disabled={isSubmitting || editingId === type.id}
                            />
                          </TableCell>
                          {/* ... actions ... */}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  onPageChange={setCurrentPage}
                />
              </>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No unit types yet. Create one above.
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

## Benefits

1. **Total Items Count** - Shows "(X total)" next to section headers
2. **Sortable Columns** - Click column headers to sort ascending/descending
3. **Pagination** - Handles large datasets with smart page number display
4. **Primary Color Switches** - Active switches use the main app color (already implemented)
5. **Reusable Code** - DRY principle with shared hooks and components
6. **Consistent UX** - All managers behave the same way

## Files Created

1. `src/hooks/usePaginatedSortedData.ts` - Reusable hook
2. `src/components/Pagination.tsx` - Pagination UI component
3. `src/components/SortableTableHead.tsx` - Sortable table header component
4. `MANAGER_IMPROVEMENTS.md` - This documentation

## Next Steps

1. Update `LocationManager.tsx` using the pattern above
2. Update `AddonTypeManager.tsx` using the pattern above
3. Update `AddonManager.tsx` using the pattern above
4. Update `BuildingFloorManager.tsx` using the pattern above (if keeping it)
5. Test all managers to ensure pagination and sorting work correctly
