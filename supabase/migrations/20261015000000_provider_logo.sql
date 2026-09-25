-- gates-admin: provider logo instead of phone
--
-- The providers catalog is just for admins to recognize a delivery
-- company/vendor/courier when logging a visit — not a directory people
-- contact, so phone doesn't pull its weight. Swap it for a logo image
-- (public bucket, same choice as visit-qrcodes: non-sensitive, no signed
-- URL machinery needed).

alter table public.providers drop column if exists phone;
alter table public.providers add column if not exists logo_url text;

insert into storage.buckets (id, name, public)
values ('provider-logos', 'provider-logos', true)
on conflict (id) do nothing;

-- Objects are stored at "<residential_id>/<file>" for a residential's own
-- provider, or "global/<file>" for the platform-wide catalog — mirrors the
-- amenity-images convention of encoding the scope as the first path segment
-- so RLS can check it without a join.

drop policy if exists "provider-logos: public read" on storage.objects;
create policy "provider-logos: public read"
  on storage.objects for select
  to public
  using (bucket_id = 'provider-logos');

drop policy if exists "provider-logos: platform admin write global" on storage.objects;
create policy "provider-logos: platform admin write global"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'provider-logos' and (storage.foldername(name))[1] = 'global' and is_platform_admin())
  with check (bucket_id = 'provider-logos' and (storage.foldername(name))[1] = 'global' and is_platform_admin());

drop policy if exists "provider-logos: residential admin write own" on storage.objects;
create policy "provider-logos: residential admin write own"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'provider-logos'
    and (storage.foldername(name))[1] != 'global'
    and is_residential_admin((storage.foldername(name))[1]::uuid)
  )
  with check (
    bucket_id = 'provider-logos'
    and (storage.foldername(name))[1] != 'global'
    and is_residential_admin((storage.foldername(name))[1]::uuid)
  );
