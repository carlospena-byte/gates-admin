-- Lets the mobile app react live to a new/forced release while it is open.
-- Realtime only delivers rows the subscriber can SELECT, so the app (anon or
-- signed in) needs read access. Release rows (version, store URL, notes) are
-- public information; writes stay platform-admin only.
drop policy if exists "app_versions: select all" on public.app_versions;
create policy "app_versions: select all"
  on public.app_versions for select to anon, authenticated
  using (true);

grant select on public.app_versions to anon;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'app_versions'
  ) then
    alter publication supabase_realtime add table public.app_versions;
  end if;
end $$;
