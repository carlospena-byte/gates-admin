# Diagnostic Checklist - Dashboard Not Showing Units

## Current Situation

You mentioned:
- "manager show items created" - Managers (UnitTypeManager, etc.) are showing data
- "I can't see even I've 5 units" - The main dashboard units table is empty

## Step-by-Step Diagnostic

### 1. Clear Session (MOST IMPORTANT)

In browser console (F12 > Console):

```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

Then login with `owner@residential.com` / `test123`

### 2. Check Console Logs

After logging in and viewing the dashboard, check for these logs:

```
📊 unitService.listByResidential called: { residentialId: "550e8400-..." }
📊 unitService.listByResidential result: { unitsCount: 5, units: [...] }
```

**If you see `unitsCount: 0`:**
- RLS is blocking the query
- Session is invalid
- You're not logged in as owner

**If you see `unitsCount: 5`:**
- API is working
- Data is being fetched
- Problem is in the UI rendering

### 3. Check for Errors

Look for errors in console:
- ❌ "Invalid Refresh Token" → Clear session again
- ❌ "row-level security policy" → Session invalid
- ❌ "No access" → Not logged in properly

### 4. Manually Test API

In browser console after logging in:

```javascript
const { supabase } = await import('/src/lib/supabaseClient.ts');

// Test session
const { data: { session } } = await supabase.auth.getSession();
console.log('Current user:', session?.user?.email);

// Test units query
const { data, error } = await supabase
  .from('units')
  .select('*')
  .eq('residential_id', '550e8400-e29b-41d4-a716-446655440000');

console.log('Units from DB:', { count: data?.length, units: data, error });
```

**Expected result:** You should see 5 units

### 5. Check Dashboard Component

In browser console:

```javascript
// This will show what data the dashboard has
const dashboardState = window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.get(1)?.getCurrentFiber?.();
console.log('Dashboard state:', dashboardState);
```

### 6. Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Empty table but managers work | Data is loading but not rendering - check `units` variable in dashboard |
| "No units yet" message shows | `units` array is empty or undefined |
| RLS policy errors | Session is stale - clear localStorage |
| Nothing loads at all | Check network tab for failed requests |

### 7. Verify Database Has Units

Direct database check:

```sql
SELECT id, name, residential_id
FROM public.units
WHERE residential_id = '550e8400-e29b-41d4-a716-446655440000';
```

Should return 5 rows: 101, 102, 201, 202, 301

### 8. Check useQuery Hook

The dashboard uses:

```typescript
const { data: units, isLoading: unitsLoading, error: unitsError } = useQuery(
  () => unitService.listByResidential(residentialId),
  { enabled: Boolean(residentialId) && !sessionLoading && Boolean(session) }
);
```

In console, check:
- Is `residentialId` set? (should be `550e8400-...`)
- Is `session` valid?
- Is `sessionLoading` false?

### 9. Force Refresh

Try clicking the "Refresh" button on the dashboard

OR in console:

```javascript
location.reload();
```

## Most Likely Root Cause

**90% chance:** Your browser has a stale session from before the database reset.

**Fix:** Clear localStorage and login fresh (Step 1 above)

## Debug Output to Share

If still not working after clearing session, share these console logs:

1. The output from Step 2 (`unitService.listByResidential result`)
2. Any errors from Step 3
3. The output from Step 4 (manual API test)

This will tell me exactly what's wrong!
