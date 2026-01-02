# Comprehensive Refactor Plan

## Critical Issues Identified

### 1. Authentication & Session Management ❌
**Problems:**
- OTP-only login requires checking emails (doesn't work in dev)
- `useSession` has race conditions (loads twice)
- `useAccess` doesn't invalidate when session changes
- No dev-mode password login fallback

**Impact**: Can't login reliably, especially in development

### 2. RLS Policies Blocking Owner Access ❌
**Problems:**
- `auth.uid()` not returning correct value in RLS context
- Owner user can't query their own residential
- Queries return empty arrays despite data existing

**Impact**: "No access" error for valid users

### 3. No Real-Time Data Updates ❌
**Problems:**
- Sheet components don't refetch after mutations
- Creating a unit doesn't show in list
- Manual refresh required to see changes

**Impact**: Users think operations failed when they succeeded

### 4. State Management Architecture ❌
**Problems:**
- Each component manages its own state
- No global state for user/session
- Duplicate API calls across components
- No caching or invalidation strategy

**Impact**: Poor performance, stale data, race conditions

## Refactor Strategy

### Phase 1: Fix Authentication (CRITICAL)
1. Add password login for development
2. Refactor session management to use React Context
3. Fix useAccess to depend on session properly
4. Add session debugging tools

### Phase 2: Fix RLS Policies (CRITICAL)
1. Debug why auth.uid() doesn't work
2. Simplify RLS policies
3. Add fallback queries that don't rely on RLS
4. Add better error messages

### Phase 3: Implement Real-Time Updates
1. Add data refetch after mutations
2. Implement optimistic updates
3. Add loading states
4. Consider React Query for caching

### Phase 4: SOLID Refactoring
1. Single Responsibility: Separate data fetching from UI
2. Open/Closed: Use composition patterns
3. Liskov Substitution: Proper TypeScript interfaces
4. Interface Segregation: Split large interfaces
5. Dependency Inversion: Use dependency injection

## Immediate Action Plan

**Priority 1: Enable Password Login** (15 min)
- Add password input to LoginPage
- Support both OTP and password
- Default to password in development

**Priority 2: Fix Session State** (30 min)
- Create SessionContext with proper state management
- Remove race conditions in useSession
- Make useAccess reactive to session changes

**Priority 3: Fix Owner Access** (45 min)
- Debug RLS policies
- Add service role bypass for debugging
- Fix or replace broken policies

**Priority 4: Add Data Refetching** (30 min)
- Add refetch callbacks to sheet components
- Implement optimistic updates
- Add success/error toast notifications

## File Changes Required

### New Files:
1. `src/contexts/SessionContext.tsx` - Global session state
2. `src/contexts/DataContext.tsx` - Global data cache
3. `src/hooks/useAuthenticatedQuery.ts` - Authenticated API calls
4. `src/hooks/useAuthenticatedMutation.ts` - Mutations with refetch
5. `src/lib/auth.ts` - Auth helpers
6. `DEBUG_AUTH_ISSUES.md` - Debugging guide

### Modified Files:
1. `src/pages/LoginPage.tsx` - Add password login
2. `src/state/useSession.ts` - Use SessionContext
3. `src/state/useAccess.ts` - Fix reactivity
4. `src/App.tsx` - Wrap with SessionProvider
5. All `*Manager.tsx` components - Use refetch hooks
6. `supabase/migrations/` - Fix RLS policies

## Success Criteria

- ✅ Can login with password in development
- ✅ Session state doesn't race/flicker
- ✅ Owner can access their residential
- ✅ Creating a unit shows immediately in list
- ✅ No manual refresh needed
- ✅ Clear error messages
- ✅ Code follows SOLID principles
