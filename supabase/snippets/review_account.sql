-- Reviewer account for App Store / Play Store.
-- Run in the Supabase SQL editor AFTER the auth user exists (see steps below).
--
-- 1. Create the auth user (Dashboard > Authentication > Add user > "Auto Confirm",
--    or admin API createUser with email_confirm: true). Use the same email as
--    the REVIEW_EMAIL secret.
-- 2. Set the function secrets:
--      supabase secrets set REVIEW_EMAIL=demo@vecinoo.app REVIEW_CODE=000000
-- 3. Deploy:  supabase functions deploy review-login
-- 4. Run this script (edit the email below). It is idempotent.
--
-- To disable the backdoor: supabase secrets unset REVIEW_EMAIL REVIEW_CODE

do $$
declare
  v_email text := lower('demo@vecinoo.app');  -- <-- same as REVIEW_EMAIL
  v_user_id uuid;
  v_res_id uuid;
  v_unit_id uuid;
begin
  select id into v_user_id from auth.users where lower(email) = v_email;
  if v_user_id is null then
    raise exception 'Create the auth user % first', v_email;
  end if;

  insert into public.profiles (user_id, email, first_name, last_name)
  values (v_user_id, v_email, 'App', 'Reviewer')
  on conflict (user_id) do update set email = excluded.email;

  -- Target residential (must already exist).
  select id into v_res_id from public.residentials where name = 'Residencial Prueba';
  if v_res_id is null then
    raise exception 'Residential "Residencial Prueba" not found';
  end if;

  -- Move: clear this user's links outside the target. The earlier "Review
  -- Residential" is emptied but not deleted (the audit trigger's FK makes a
  -- residential delete fail here); remove it from the admin UI if wanted.
  update public.residentials set owner_user_id = null
  where name = 'Review Residential' and owner_user_id = v_user_id;
  delete from public.units
  where owner_user_id = v_user_id and residential_id <> v_res_id
    and name = 'Review Unit';
  delete from public.unit_members
  where user_id = v_user_id and residential_id <> v_res_id;
  delete from public.unit_residents
  where lower(email) = v_email and residential_id <> v_res_id;
  delete from public.residential_users
  where user_id = v_user_id and residential_id <> v_res_id;

  insert into public.residential_users (residential_id, user_id, role)
  values (v_res_id, v_user_id, 'member')
  on conflict (residential_id, user_id) do nothing;

  select id into v_unit_id from public.units
  where residential_id = v_res_id and name = 'Review Unit';
  if v_unit_id is null then
    insert into public.units (residential_id, name, owner_user_id)
    values (v_res_id, 'Review Unit', v_user_id)
    returning id into v_unit_id;
  end if;

  insert into public.unit_members (unit_id, residential_id, user_id)
  values (v_unit_id, v_res_id, v_user_id)
  on conflict (unit_id, user_id) do nothing;

  -- Contact-info row: this is what the admin "Residentes" screen lists.
  if not exists (
    select 1 from public.unit_residents
    where unit_id = v_unit_id and lower(email) = v_email
  ) then
    insert into public.unit_residents (unit_id, residential_id, first_name, last_name, email)
    values (v_unit_id, v_res_id, 'App', 'Reviewer', v_email);
  end if;

  raise notice 'Reviewer % linked to residential % / unit %', v_email, v_res_id, v_unit_id;
end $$;
