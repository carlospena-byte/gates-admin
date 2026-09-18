-- gates-admin: find_profile_id_by_email
-- residentialUserService already had add/updateRole/remove, but there was
-- no way to look up an unconnected email's user_id to add them — the
-- "profiles: residential members view" policy only shows profiles of
-- people who already share a residential with you. This RPC bridges that
-- gap for the "add member by email" flow, without exposing the full
-- profiles row: it returns only a user_id, and only to callers who are
-- already an owner/admin of some residential (or a platform admin).
--
-- Limitation (documented, not fixed here): this only finds people who
-- have signed in at least once (i.e. already have a profiles row). A true
-- "invite someone who has never used the app" flow needs an Edge Function
-- + email provider (Resend) and is out of scope for this migration.

create or replace function public.find_profile_id_by_email(_email text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.user_id
  from public.profiles p
  where p.email = _email
    and (
      is_platform_admin()
      or exists (
        select 1 from public.residential_users ru
        where ru.user_id = auth.uid()
          and ru.role in ('owner', 'admin')
      )
    )
  limit 1;
$$;

alter function public.find_profile_id_by_email(text) owner to postgres;
grant execute on function public.find_profile_id_by_email(text) to authenticated;
