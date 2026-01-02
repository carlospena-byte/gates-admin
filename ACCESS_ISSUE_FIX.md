# Access Issue Fix Summary

## Problem Statement

User `owner@residential.com` was seeing "No access - This user has no admin role assigned" despite:
- ✅ User existing in auth.users
- ✅ Profile existing in public.profiles
- ✅ Residential existing with correct owner_user_id
- ✅ residential_users entry with role='admin'

## Root Cause Analysis

### Issue #1: OTP-Only Login in Development
**Problem**: Login required checking emails for OTP codes, making development painful.

**Fix**: Added password login support with auto-fill in development mode.

**File Changed**: [src/pages/LoginPage.tsx](src/pages/LoginPage.tsx)

**Changes**:
- Added password login mode (default in development)
- Auto-fills `owner@residential.com` / `dev-only` in dev
- Toggle between password and OTP modes
- Enter key support for better UX

### Issue #2: RLS Policies Blocking Queries
**Problem**: When querying as authenticated user, RLS policies called `auth.uid()` which returned null, blocking all queries.

**Diagnosis**:
```bash
# With publishable key (RLS enabled) - returns empty
curl "http://127.0.0.1:64321/rest/v1/residentials?..." \
  -H "Authorization: Bearer sb_publishable_..."
# Result: []

# With service role key (RLS bypassed) - returns data
curl "http://127.0.0.1:64321/rest/v1/residentials?..." \
  -H "Authorization: Bearer sb_secret_..."
# Result: [{"id":"...","name":"Demo Residential"}]
```

**Hypothesis**: Session JWT not being properly set/sent after login, causing `auth.uid()` to return null in RLS context.

### Issue #3: useAccess Hook Logic
**Problem**: The `useAccess` hook in [src/state/useAccess.ts](src/state/useAccess.ts) checks permissions in this order:

1. Check if platform admin → return early if true
2. Check if owns residential → return early if true
3. Check if residential_users entry exists → return access

If step #2 query returns empty (due to RLS), it falls through to step #3.
If step #3 also returns empty, it sets `access = null` → "No access" error.

**Issue**: Both queries rely on RLS policies that use `auth.uid()`, which fails if session isn't properly established.

## Solutions Implemented

### ✅ 1. Password Login (Immediate Fix)
**Status**: COMPLETE

**Changes**:
- Modified [src/pages/LoginPage.tsx](src/pages/LoginPage.tsx)
- Defaults to password mode in development
- Auto-fills credentials for faster testing
- Uses `supabase.auth.signInWithPassword()` which properly sets session

**How to Test**:
```bash
# Refresh browser (Cmd+Shift+R)
# Login page should show:
# Email: owner@residential.com (prefilled)
# Password button (not OTP button)
# Click "Continue" then "Sign In"
```

### 🔄 2. Session Debugging (In Progress)
**Next Steps**:
1. Add console logging to `useSession` and `useAccess`
2. Verify JWT token is present after login
3. Check if `auth.uid()` works in database queries
4. Add error messages showing which query failed

### 🔄 3. RLS Policy Review (Pending)
**Investigations Needed**:
1. Test if `auth.uid()` works correctly after password login
2. Review all RLS policies for potential issues
3. Consider adding service-role fallback for development
4. Simplify policies to reduce complexity

### 🔄 4. Real-Time Data Updates (Pending)
**Problem**: Creating a unit doesn't show in list until manual refresh

**Solution**: Add data refetch after mutations
- Callback prop: `onDataChanged={() => loadData()}`
- Optimistic updates for immediate feedback
- Toast notifications for success/error

## Testing Checklist

- [ ] Login with `owner@residential.com` / `dev-only` works
- [ ] After login, user is redirected to dashboard (not "No access")
- [ ] Can see residential name in dashboard
- [ ] Can open "Units" manager
- [ ] Creating a unit shows immediately in list
- [ ] No console errors about RLS policies

## Quick Test

1. **Stop dev server**: Ctrl+C in terminal
2. **Restart**: `npm run dev`
3. **Hard refresh browser**: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
4. **Login**: Email should be prefilled, click Continue → Sign In
5. **Check**: Should see dashboard, not "No access" error

## Debug Commands

```bash
# Check if users exist
docker exec supabase_db_gates-admin psql -U postgres -c \
  "SELECT id, email FROM auth.users;"

# Check profiles
docker exec supabase_db_gates-admin psql -U postgres -c \
  "SELECT user_id, email FROM public.profiles;"

# Check residential_users
docker exec supabase_db_gates-admin psql -U postgres -c \
  "SELECT residential_id, user_id, role FROM public.residential_users;"

# Check residentials
docker exec supabase_db_gates-admin psql -U postgres -c \
  "SELECT id, name, owner_user_id FROM public.residentials;"
```

## Next Steps

1. **Test password login** - Verify it works and sets session properly
2. **If still "No access"** - Add debug logging to useAccess hook
3. **Check browser console** - Look for failed queries or auth errors
4. **Review RLS policies** - Ensure they work with password auth
5. **Add refetch mechanism** - Make UI update after creating units

## Related Files

- [src/pages/LoginPage.tsx](src/pages/LoginPage.tsx) - Password login added
- [src/state/useSession.ts](src/state/useSession.ts) - Session management
- [src/state/useAccess.ts](src/state/useAccess.ts) - Access control logic
- [src/App.tsx](src/App.tsx) - Main app with access checks
- [COMPREHENSIVE_REFACTOR_PLAN.md](COMPREHENSIVE_REFACTOR_PLAN.md) - Full refactor plan
