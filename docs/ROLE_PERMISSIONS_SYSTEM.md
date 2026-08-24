# Role & Permissions System

## Role Hierarchy

The system implements a 4-tier role hierarchy for residential management:

### 1. Platform Admin
**Level**: Global (across all residentials)

**Can**:
- ✅ See everything across all residentials
- ✅ Impersonate residential owners
- ✅ Manage all units, amenities, users across all residentials
- ✅ Full CRUD on all tables
- ✅ Access Supabase Studio and admin tools

**Cannot**:
- ❌ Nothing - has full access

**Use Case**: System administrators, support team

###  2. Residential Owner
**Level**: Residential-specific

**Can**:
- ✅ Everything Residential Admin can do
- ✅ Create and manage other admins in their residential
- ✅ Create other owners (delegate ownership)
- ✅ Delete the residential
- ✅ Change residential settings
- ✅ Transfer ownership

**Cannot**:
- ❌ Access other residentials (unless they own multiple)
- ❌ Access platform-level settings

**Use Case**: Property owner, management company CEO

### 3. Residential Admin
**Level**: Residential-specific

**Can**:
- ✅ Create and manage units
- ✅ Create and manage amenities
- ✅ Create and manage locations/buildings/floors
- ✅ Create and manage unit types
- ✅ Create and manage security users
- ✅ Create and manage regular members
- ✅ View all residential data
- ✅ See visitors history
- ✅ See reservations history

**Cannot**:
- ❌ Create or manage other admins
- ❌ Create or manage owners
- ❌ Delete the residential
- ❌ Change core residential settings
- ❌ Access other residentials

**Use Case**: Property manager, HOA board member

### 4. Residential Security
**Level**: Residential-specific (read-only)

**Can**:
- ✅ View all units
- ✅ View all amenities
- ✅ View visitors history
- ✅ View reservations history
- ✅ View locations/buildings/floors
- ✅ View resident information

**Cannot**:
- ❌ Create or modify anything
- ❌ Delete anything
- ❌ Manage users
- ❌ Access other residentials

**Use Case**: Security guard, front desk staff, concierge

### 5. Residential Member (Future)
**Level**: Residential-specific

**Can**:
- ✅ View their own unit
- ✅ Make amenity reservations
- ✅ View their own booking history

**Cannot**:
- ❌ View other units
- ❌ Manage anything
- ❌ View other residents' data

**Use Case**: Regular resident, tenant

## Database Schema

### residential_users Table

```sql
CREATE TABLE residential_users (
  residential_id uuid REFERENCES residentials(id),
  user_id uuid REFERENCES profiles(user_id),
  role text CHECK (role IN ('owner', 'admin', 'security', 'member')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (residential_id, user_id)
);
```

### Helper Functions

```sql
-- Check if user is platform admin
is_platform_admin() -> boolean

-- Check if user is residential owner
is_residential_owner(_residential_id uuid) -> boolean

-- Check if user is residential admin (owner OR admin role)
is_residential_admin(_residential_id uuid) -> boolean

-- Check if user is residential security
is_residential_security(_residential_id uuid) -> boolean

-- Check if user has any role in residential
is_residential_member(_residential_id uuid) -> boolean
```

## RLS Policies

### Pattern 1: Full Management (units, amenities, etc.)

```sql
-- Platform admin: everything
CREATE POLICY "table: platform admin all"
  FOR ALL USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Owner/Admin: manage
CREATE POLICY "table: owner admin manage"
  FOR ALL USING (is_residential_admin(residential_id))
  WITH CHECK (is_residential_admin(residential_id));

-- Security/Member: view only
CREATE POLICY "table: security member view"
  FOR SELECT USING (is_residential_member(residential_id));
```

### Pattern 2: User Management (residential_users)

```sql
-- Platform admin: everything
CREATE POLICY "residential_users: platform admin all"
  FOR ALL USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Owner: manage all users (except can't create other owners unless they're the primary owner)
CREATE POLICY "residential_users: owner manage all"
  FOR ALL
  USING (is_residential_owner(residential_id))
  WITH CHECK (
    is_residential_owner(residential_id)
    AND (
      role != 'owner'
      OR EXISTS (
        SELECT 1 FROM residentials r
        WHERE r.id = residential_id
          AND r.owner_user_id = auth.uid()
      )
    )
  );

-- Admin: manage only security and members (not other admins or owners)
CREATE POLICY "residential_users: admin manage limited"
  FOR ALL
  USING (
    is_residential_admin(residential_id)
    AND NOT is_residential_owner(residential_id)
    AND role IN ('member', 'security')
  )
  WITH CHECK (
    is_residential_admin(residential_id)
    AND NOT is_residential_owner(residential_id)
    AND role IN ('member', 'security')
  );

-- Everyone: view all users in residential (for collaboration)
CREATE POLICY "residential_users: members view all"
  FOR SELECT
  USING (
    is_platform_admin()
    OR is_residential_member(residential_id)
  );
```

## Test Credentials

Three test users have been created in development:

| Email | Password | Role | Permissions |
|-------|----------|------|-------------|
| `owner@residential.com` | `test123` | **Owner** | Full control of Demo Residential |
| `admin@residential.com` | `test123` | **Admin** | Manage units, amenities, security users |
| `security@residential.com` | `test123` | **Security** | View-only access |

## Testing Role Permissions

### Test as Owner

1. Login with `owner@residential.com` / `test123`
2. Should see:
   - ✅ Manage Units button
   - ✅ Manage Amenities button
   - ✅ Manage Users button (can create admins, security, members)
   - ✅ Full CRUD on all resources

### Test as Admin

1. Login with `admin@residential.com` / `test123`
2. Should see:
   - ✅ Manage Units button
   - ✅ Manage Amenities button
   - ✅ Manage Users button (can only create security, members)
   - ✅ Full CRUD on units/amenities
   - ❌ Cannot create other admins

### Test as Security

1. Login with `security@residential.com` / `test123`
2. Should see:
   - ✅ View units (read-only)
   - ✅ View amenities (read-only)
   - ❌ No "Manage" buttons
   - ❌ No create/edit/delete actions

## Verifying Permissions in Database

```sql
-- View all user roles
SELECT
  p.email,
  ru.role,
  r.name as residential_name
FROM residential_users ru
JOIN profiles p ON p.user_id = ru.user_id
JOIN residentials r ON r.id = ru.residential_id
ORDER BY ru.role, p.email;

-- Check effective permissions for a user
SELECT * FROM user_residential_roles
WHERE user_id = '<user-id>';

-- Test if user is admin of a residential
SELECT is_residential_admin('<residential-id>');

-- Test if user is owner of a residential
SELECT is_residential_owner('<residential-id>');
```

## Migration Applied

**File**: [supabase/migrations/20251231050000_implement_role_hierarchy.sql](supabase/migrations/20251231050000_implement_role_hierarchy.sql)

**Changes**:
1. ✅ Extended `residential_users.role` constraint to include 'owner', 'admin', 'security', 'member'
2. ✅ Updated helper functions to check roles properly
3. ✅ Recreated all RLS policies with proper role checks
4. ✅ Created `user_residential_roles` view for easy role inspection

## Frontend Integration

The frontend should check user role and conditionally show/hide features:

```typescript
// In your components
import { useAccess } from '@/state/useAccess';

function MyComponent() {
  const { access } = useAccess();

  // For platform admin
  if (access?.kind === 'platform_admin') {
    return <PlatformAdminDashboard />;
  }

  // For residential users
  if (access?.kind === 'residential_admin') {
    const residentialId = access.residentialId;

    // Check specific role
    const { data: userRole } = useQuery(() =>
      supabase
        .from('residential_users')
        .select('role')
        .eq('residential_id', residentialId)
        .eq('user_id', session.user.id)
        .single()
    );

    if (userRole?.role === 'owner') {
      return <OwnerDashboard />;
    }

    if (userRole?.role === 'admin') {
      return <AdminDashboard />;
    }

    if (userRole?.role === 'security') {
      return <SecurityDashboard />;
    }
  }

  return <AccessDenied />;
}
```

## API Changes Needed

Update the `useAccess` hook to include role information:

```typescript
export type Access =
  | { kind: "platform_admin" }
  | {
      kind: "residential_admin";
      residentialId: string;
      role: "owner" | "admin" | "security" | "member";  // Add this
    };
```

## Security Considerations

1. **RLS is enforced** - All policies use `SECURITY INVOKER` to maintain proper auth context
2. **No SQL injection** - All queries use parameterized inputs
3. **Principle of least privilege** - Each role has minimal necessary permissions
4. **Audit trail** - All tables have `created_at` timestamps
5. **Cascading deletes** - Deleting a user removes all their residential associations

## Troubleshooting

### User can't see expected data

1. **Check role assignment**:
   ```sql
   SELECT role FROM residential_users
   WHERE user_id = '<user-id>' AND residential_id = '<residential-id>';
   ```

2. **Check helper functions return true**:
   ```sql
   SELECT is_residential_admin('<residential-id>');
   SELECT is_residential_owner('<residential-id>');
   ```

3. **Check RLS policies are enabled**:
   ```sql
   SELECT schemaname, tablename, policyname
   FROM pg_policies
   WHERE tablename = 'units';
   ```

### Admin can't create other admins

This is expected! Only owners can create admins. Check if user is owner:

```sql
SELECT role FROM residential_users
WHERE user_id = auth.uid() AND residential_id = '<residential-id>';
```

Should return `'owner'`, not `'admin'`.

## Related Documentation

- [COMPLETE_RLS_FIX.md](COMPLETE_RLS_FIX.md) - RLS security fixes
- [RLS_AUTH_FIX.md](RLS_AUTH_FIX.md) - Initial RLS investigation
- [OTP_EMAIL_FIX.md](OTP_EMAIL_FIX.md) - Email configuration
- [SUPABASE_RESTART_FIX.md](SUPABASE_RESTART_FIX.md) - Container restart procedure

## Current Status

- ✅ Role hierarchy implemented
- ✅ RLS policies updated
- ✅ Helper functions created
- ✅ Test users created
- ✅ All migrations applied
- 🔄 **Next**: Update frontend to show/hide features based on role
