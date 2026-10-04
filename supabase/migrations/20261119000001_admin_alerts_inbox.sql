-- gates-admin: admin_alerts as an inbox (read / unread / archived).
--
-- The admin panel now has a Notifications page that works like a mailbox, so
-- an alert needs its own read and archive state, separate from `resolved_at`
-- (which stays "the action was taken": the paid booking's payment was voided).
-- A resolved alert remains in the inbox as history until it is archived.
-- State is shared by the residential's admins, like the alert itself.

alter table public.admin_alerts
  add column if not exists read_at timestamptz,
  add column if not exists archived_at timestamptz;

-- Unread badge: open + not archived + not read.
create index if not exists idx_admin_alerts_unread
  on public.admin_alerts (residential_id) where read_at is null and archived_at is null;

