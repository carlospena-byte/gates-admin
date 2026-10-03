-- The admin's Today inbox and sidebar badges refresh live. Realtime only
-- delivers rows the subscriber can SELECT (RLS still applies), so this just
-- adds the operational tables to the publication.
do $$
declare
  t text;
begin
  foreach t in array array['incidents', 'amenity_bookings', 'unit_rental_payments', 'visitors']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
