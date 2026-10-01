-- gates-admin: check_email_login_status
-- The plain login screen (email OTP) doesn't check invitations at all —
-- Supabase's signInWithOtp happily creates a brand-new auth user for any
-- email, including one an admin already invited to a unit but who hasn't
-- entered their invitation code yet. That leaves the resident with a
-- disconnected account (stuck on pending_link_screen.dart) instead of the
-- "Valida tu código" flow that actually links them, and is confusing.
--
-- This lets gates-app check *before* sending a code whether an email
-- belongs to a resident who's still only invited (not yet linked to any
-- unit), so the login screen can block that specific case and point them
-- at the invitation flow instead. Callable by `anon` (checked before any
-- session exists), and — like unit_resident_status — never exposes the
-- invitation code itself, only a status.
create or replace function public.check_email_login_status(_email text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _email_norm text := lower(trim(_email));
  _has_membership boolean;
  _has_pending_invite boolean;
begin
  select exists (
    select 1
    from public.profiles p
    join public.unit_members um on um.user_id = p.user_id
    where p.email = _email_norm
  ) into _has_membership;

  if _has_membership then
    return 'active';
  end if;

  select exists (
    select 1
    from public.unit_invitations ui
    where ui.email = _email_norm
      and ui.status = 'pending'
      and ui.expires_at >= now()
  ) into _has_pending_invite;

  if _has_pending_invite then
    return 'invited';
  end if;

  return 'unknown';
end;
$$;

alter function public.check_email_login_status(text) owner to postgres;
grant execute on function public.check_email_login_status(text) to anon, authenticated;
