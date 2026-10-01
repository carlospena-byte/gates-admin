-- Adds the visitors table to the supabase_realtime publication so the
-- resident app's postgres_changes stream (visits_repository.dart) picks up
-- status transitions (e.g. check-in to "inside") live, instead of only on
-- manual pull-to-refresh.
alter publication supabase_realtime add table public.visitors;
