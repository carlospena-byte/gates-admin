# useAccess Hook Update - Role Support

## Problem

The `useAccess` hook was only checking for users with `role = 'admin'`, which excluded:
- ✅ Residential owners (who have `role = 'owner'`)
- ✅ Security staff (who have `role = 'security'`)
- ✅ Regular members (who have `role = 'member'`)

This caused owners to get "No access" even though they should have full permissions.

## Solution

Updated the `useAccess` hook to:
1. Check for ALL roles (`owner`, `admin`, `security`, `member`)
2. Include the user's role in the returned `Access` type
3. Simplify the logic by removing duplicate residential ownership check

## Changes Made

### Updated Access Type

**Before:**
```typescript
export type Access =
  | { kind: "platform_admin" }
  | { kind: "residential_admin"; residentialId: string };
```

**After:**
```typescript
export type Access =
  | { kind: "platform_admin" }
  | {
      kind: "residential_admin";
      residentialId: string;
      role: "owner" | "admin" | "security" | "member";  // Added role
    };
```

### Updated Query Logic

**Before:**
```typescript
// Only checked for role = 'admin'
const { data: residentialAdminRow } = await supabase
  .from("residential_users")
  .select("residential_id, role")
  .eq("user_id", userId)
  .eq("role", "admin")  // ❌ Excluded owners!
  .maybeSingle();
```

**After:**
```typescript
// Checks for all roles
const { data: residentialUserRow } = await supabase
  .from("residential_users")
  .select("residential_id, role")
  .eq("user_id", userId)
  .in("role", ["owner", "admin", "security", "member"])  // ✅ All roles
  .maybeSingle();

// Include role in the result
setAccess({
  kind: "residential_admin",
  residentialId: residentialUserRow.residential_id,
  role: residentialUserRow.role,  // ✅ Now available to components
});
```

## How to Use in Components

Now components can check the user's specific role:

```typescript
import { useAccess } from "@/state/useAccess";

function MyComponent() {
  const { access } = useAccess();

  if (access?.kind === "platform_admin") {
    return <PlatformAdminView />;
  }

  if (access?.kind === "residential_admin") {
    const { residentialId, role } = access;

    // Show different UI based on role
    if (role === "owner") {
      return <OwnerDashboard residentialId={residentialId} />;
    }

    if (role === "admin") {
      return <AdminDashboard residentialId={residentialId} />;
    }

    if (role === "security") {
      return <SecurityDashboard residentialId={residentialId} />;
    }

    if (role === "member") {
      return <MemberDashboard residentialId={residentialId} />;
    }
  }

  return <NoAccess />;
}
```

## Conditional Feature Rendering

You can now show/hide features based on role:

```typescript
function UnitManager({ residentialId }: { residentialId: string }) {
  const { access } = useAccess();

  // Only owners and admins can create units
  const canManageUnits = access?.kind === "residential_admin"
    && (access.role === "owner" || access.role === "admin");

  // Only owners can create other admins
  const canCreateAdmins = access?.kind === "residential_admin"
    && access.role === "owner";

  // Security can only view
  const isReadOnly = access?.kind === "residential_admin"
    && access.role === "security";

  return (
    <div>
      <UnitList readOnly={isReadOnly} />

      {canManageUnits && (
        <Button onClick={createUnit}>Create Unit</Button>
      )}

      {canCreateAdmins && (
        <Button onClick={manageAdmins}>Manage Admins</Button>
      )}
    </div>
  );
}
```

## Benefits

1. ✅ **Owners now have access** - No more "No access" error for owners
2. ✅ **Role-based UI** - Components can show/hide features based on role
3. ✅ **Type-safe** - TypeScript knows which roles are valid
4. ✅ **Simpler logic** - Single query instead of multiple checks
5. ✅ **Better debugging** - Console logs show the user's role

## Testing

**Login as different users to see different access:**

| Email | Role | What They See |
|-------|------|---------------|
| `owner@residential.com` | `owner` | Full dashboard + all management features |
| `admin@residential.com` | `admin` | Dashboard + unit/amenity management |
| `security@residential.com` | `security` | Read-only dashboard |

## Console Output

When you login, you'll now see:

```
🔍 useAccess: Checking access for user: { userId: "...", email: "owner@residential.com", hasSession: true }
🔍 useAccess: Checking platform_admins...
🔍 useAccess: platform_admins result: null
🔍 useAccess: Checking residential_users...
🔍 useAccess: residential_users result: { residential_id: "...", role: "owner" }
✅ useAccess: User has residential access: { residentialId: "...", role: "owner" }
```

## File Modified

[src/state/useAccess.ts](src/state/useAccess.ts) - Lines 5-7, 80-132

## Related Documentation

- [ROLE_PERMISSIONS_SYSTEM.md](ROLE_PERMISSIONS_SYSTEM.md) - Complete role hierarchy documentation
- [COMPLETE_RLS_FIX.md](COMPLETE_RLS_FIX.md) - RLS security fixes

## Migration Status

- ✅ Database migrations applied
- ✅ RLS policies updated
- ✅ useAccess hook updated
- ✅ Type system updated
- 🔄 **Next**: Update components to use role-based rendering

## Success Criteria

- ✅ Owners can see dashboard
- ✅ Owners can create units, amenities, users
- ✅ Admins can create units, amenities (but not admins)
- ✅ Security can only view
- ✅ Role is available in `access.role`
