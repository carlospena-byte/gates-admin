-- Publishes app_config so the mobile app (anon or signed in) receives
-- maintenance-mode changes live, via postgres_changes, while it is open.
-- The "app_config: select all" policy already lets every client read the row.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'app_config'
  ) then
    alter publication supabase_realtime add table public.app_config;
  end if;
end $$;
