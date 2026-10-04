-- push_notifications: audience can also target hierarchy levels (locations,
-- e.g. a building or a floor). Selecting a level includes everything under it.
-- Stays under audience = 'units': the recipients are the union of the chosen
-- units and the units located in the chosen levels.

alter table public.push_notifications
  add column if not exists location_ids uuid[] not null default '{}';

alter table public.push_notifications drop constraint if exists push_notifications_units_check;
alter table public.push_notifications
  add constraint push_notifications_units_check
  check (audience <> 'units' or cardinality(unit_ids) > 0 or cardinality(location_ids) > 0);
