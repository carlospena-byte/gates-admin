# Infinite Loop Fix - useQuery Hook

## Problem

Browser console showed:
```
Maximum update depth exceeded. This can happen when a component calls setState
inside useEffect, but useEffect either doesn't have a dependency array, or one
of the dependencies changes on every render.
```

The error was occurring at line 54 of `useQuery.ts`.

## Root Cause

The `useQuery` hook had a **dependency chain** that caused infinite re-renders:

1. `useEffect` depends on `fetchData` (line 122)
2. `fetchData` depends on `queryFn`, `onSuccess`, `onError` (line 110)
3. `queryFn` is an **arrow function** passed from components like:
   ```typescript
   useQuery(() => unitService.listByResidential(residentialId))
   ```
4. Arrow functions create a **new reference on every render**
5. New reference → `fetchData` recreates → `useEffect` runs → component re-renders → infinite loop

## The Dependency Chain

```
Component renders
  ↓
Creates new queryFn (arrow function)
  ↓
fetchData recreates (because queryFn changed)
  ↓
useEffect runs (because fetchData changed)
  ↓
fetchData() is called
  ↓
setState() updates
  ↓
Component re-renders
  ↓
LOOP BACK TO TOP ♾️
```

## Solution

Changed `useQuery` to use **refs** instead of **dependencies**:

### Before (Caused Infinite Loop)
```typescript
const fetchData = useCallback(
  async (isRefetch = false) => {
    const result = await queryFn();  // Uses closure
    // ... handle result
  },
  [queryFn, onSuccess, onError],  // ❌ Recreates when these change
);

useEffect(() => {
  if (enabled) {
    fetchData();
  }
}, [enabled, fetchData]);  // ❌ Runs when fetchData changes
```

### After (Fixed)
```typescript
// Store functions in refs
const queryFnRef = useRef(queryFn);
const onSuccessRef = useRef(onSuccess);
const onErrorRef = useRef(onError);

// Update refs when values change (doesn't trigger re-renders)
useEffect(() => {
  queryFnRef.current = queryFn;
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;
});

const fetchData = useCallback(async (isRefetch = false) => {
  const result = await queryFnRef.current();  // Uses ref
  // ... handle result
}, []); // ✅ No dependencies - stable reference

useEffect(() => {
  if (enabled) {
    fetchData();
  }
}, [enabled]); // ✅ Only runs when enabled changes
```

## How Refs Solve It

1. **Refs don't trigger re-renders** when updated
2. **`fetchData` has no dependencies** - stable reference across renders
3. **Latest values are always used** via `.current`
4. **Effect only runs** when `enabled` changes

## Files Changed

- ✅ `src/hooks/useQuery.ts` - Fixed infinite loop with refs

## Testing

After the fix:
1. ✅ Browser loads without infinite loop
2. ✅ Dashboard displays correctly
3. ✅ Data fetching works
4. ✅ Refetch functionality works
5. ✅ Build succeeds

## Why This Pattern is Better

### ❌ Dependencies Approach
- Creates new function references
- Triggers effect on every render
- Causes infinite loops
- Hard to debug

### ✅ Refs Approach
- Stable function references
- Effect runs only when intended
- No infinite loops
- React best practice for this pattern

## Related React Patterns

This is a common pattern in React when you need to:
1. **Access latest props/state** in callbacks
2. **Avoid re-creating** callbacks on every render
3. **Prevent infinite loops** in useEffect

The pattern:
```typescript
const latestValueRef = useRef(value);

useEffect(() => {
  latestValueRef.current = value;
});

const stableCallback = useCallback(() => {
  // Use latestValueRef.current
}, []); // No dependencies
```

## Additional Notes

This issue only appeared when using the **improved dashboard** because:
- The improved dashboard uses `useQuery` hook (modern approach)
- The old dashboard used direct Supabase calls (no custom hooks)
- The custom hook pattern exposed the dependency issue

## Verification

To verify the fix works:

1. **Open browser**: http://localhost:5174/
2. **Login** as `owner@residential.com`
3. **Check console**: Should have NO errors
4. **Dashboard loads**: Units, Users, Amenities sections display
5. **No infinite loops**: Page doesn't freeze or spam requests

## Status

✅ **Fixed** - Infinite loop resolved
✅ **Tested** - Dashboard loads correctly
✅ **Build** - Passes successfully
