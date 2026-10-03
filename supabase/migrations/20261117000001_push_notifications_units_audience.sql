-- push_notifications: audience by specific units + length guards.
-- Display limits (what a phone actually shows) are enforced in the admin UI
-- (title 50 / message 178 chars); these DB checks are a looser safety net.
-- FCM/APNs cap the whole payload at 4096 bytes, far above these.

alter table public.push_notifications
  add column if not exists unit_ids uuid[] not null default '{}';

alter table public.push_notifications drop constraint if exists push_notifications_audience_check;
alter table public.push_notifications
  add constraint push_notifications_audience_check check (audience in ('everyone', 'admins', 'units'));

alter table public.push_notifications drop constraint if exists push_notifications_units_check;
alter table public.push_notifications
  add constraint push_notifications_units_check
  check (audience <> 'units' or cardinality(unit_ids) > 0);

alter table public.push_notifications drop constraint if exists push_notifications_length_check;
alter table public.push_notifications
  add constraint push_notifications_length_check
  check (char_length(title) between 1 and 100 and char_length(body) between 1 and 500);
