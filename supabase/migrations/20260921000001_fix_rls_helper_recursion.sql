-- gates-admin: fix "infinite recursion detected in policy for relation
-- residential_users" on UPDATE/DELETE against rows for another user.
--
-- Root cause (confirmed by bisecting the policies directly in psql, using
-- `set role authenticated` + `set request.jwt.claims` to reproduce the
-- exact failing UPDATE outside the app): it is NOT the helper functions
-- being `language sql` and inlineable (that's a real but separate
-- hardening, done below anyway) — it's a genuine two-table circular RLS
-- reference:
--
--   1. "residential_users: owner manage all"'s WITH CHECK runs a raw,
--      un-wrapped `exists (select 1 from residentials r where ...)` —
--      because this subquery isn't behind a SECURITY DEFINER function
--      call, it evaluates under the *caller's own RLS context*, which
--      means it evaluates residentials' own policies.
--   2. "residentials: select platform or member" in turn runs a raw
--      `exists (select 1 from residential_users ru where ...)` — again
--      not behind a SECURITY DEFINER boundary.
--
-- residential_users -> residentials -> residential_users: a real cycle.
-- "admin manage limited" alone never recurses (confirmed) because it only
-- ever goes through the SECURITY DEFINER helper functions, never touches
-- residentials directly. This only ever surfaced once the Settings > Users
-- screen (Action #6) started calling updateRole()/remove() against a
-- *different* user's row (self-view's simple `user_id = auth.uid()` check
-- had been short-circuiting every RLS evaluation up to this point).
--
-- Fix: add is_residential_true_owner(), a SECURITY DEFINER function that
-- checks residentials.owner_user_id without going through residentials'
-- own RLS, and use it in "owner manage all" instead of the raw subquery —
-- breaking the cycle. Also converts all 5 existing helpers to
-- `language plpgsql` (SQL-language functions are inlineable by the
-- planner, which can silently defeat their SECURITY DEFINER boundary) as
-- defense in depth, even though it wasn't the actual cause here.

create or replace function public.is_platform_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
  );
end;
$$;

create or replace function public.is_residential_owner(_residential_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.residentials r
    where r.id = _residential_id
      and r.owner_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.residential_users ru
    where ru.residential_id = _residential_id
      and ru.user_id = auth.uid()
      and ru.role = 'owner'
  );
end;
$$;

create or replace function public.is_residential_admin(_residential_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return is_residential_owner(_residential_id)
  or exists (
    select 1
    from public.residential_users ru
    where ru.residential_id = _residential_id
      and ru.user_id = auth.uid()
      and ru.role in ('admin', 'owner')
  );
end;
$$;

create or replace function public.is_residential_security(_residential_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.residential_users ru
    where ru.residential_id = _residential_id
      and ru.user_id = auth.uid()
      and ru.role = 'security'
  );
end;
$$;

create or replace function public.is_residential_member(_residential_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return is_residential_owner(_residential_id)
  or exists (
    select 1
    from public.residential_users ru
    where ru.residential_id = _residential_id
      and ru.user_id = auth.uid()
  );
end;
$$;

-- Checks residentials.owner_user_id directly, bypassing residentials' own
-- RLS (which would otherwise re-query residential_users and recurse).
-- Used only to gate promoting someone to the 'owner' role — a stricter
-- check than is_residential_owner(), which also accepts a residential_users
-- row with role='owner' (i.e. a co-owner), not just the true owner.
create or replace function public.is_residential_true_owner(_residential_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.residentials r
    where r.id = _residential_id
      and r.owner_user_id = auth.uid()
  );
end;
$$;

alter function public.is_residential_true_owner(uuid) owner to postgres;
grant execute on function public.is_residential_true_owner(uuid) to authenticated;

-- Recreate "owner manage all" using the new helper instead of the raw
-- inline subquery against residentials that caused the recursion.
drop policy if exists "residential_users: owner manage all" on public.residential_users;
create policy "residential_users: owner manage all"
  on public.residential_users for all
  to authenticated
  using (is_residential_owner(residential_id))
  with check (
    is_residential_owner(residential_id)
    and (role != 'owner' or is_residential_true_owner(residential_id))
  );
