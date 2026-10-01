-- gates-admin: per-day-group amenity schedules
-- `opening_time`/`closing_time`/`available_days` only support one shared
-- time range for every open day (e.g. can't say "Mon-Thu 8-9, Fri-Sat
-- 7-11"). Add a `schedule` jsonb column holding an array of
-- { days: string[], openTime: "HH:MM", closeTime: "HH:MM" } blocks, so the
-- admin form can express multiple day/time-range groups per amenity.
--
-- The old three columns are kept and still written (derived: union of all
-- block days, earliest open, latest close) so anything still reading them
-- — namely gates-app — keeps working unchanged.

alter table public.amenities
  add column if not exists schedule jsonb not null default '[]'::jsonb;
