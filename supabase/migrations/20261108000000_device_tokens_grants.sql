-- gates-admin: device_tokens table privileges
-- 20261012000000_device_tokens.sql enabled RLS and added the "own manage"
-- policy, but never granted the table itself, so:
--  * the mobile app's upsert (role authenticated) failed with 42501
--    "permission denied for table device_tokens" before RLS was evaluated;
--  * the send-push-notification / notify-visitor-checkin edge functions
--    (service_role) could not read or prune tokens either.
-- RLS still limits every authenticated row to its owner (user_id = auth.uid()).

grant select, insert, update, delete on public.device_tokens to authenticated;
grant select, insert, update, delete on public.device_tokens to service_role;
