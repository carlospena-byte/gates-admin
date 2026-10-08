-- gates-admin: register_device_token
-- An FCM token identifies one installed app, but the same phone can be signed
-- into different accounts over time. The app upserts on the unique `token`
-- column, and when the row still belongs to the previous account the
-- "own manage" RLS policy (user_id = auth.uid()) blocks the UPDATE, so the new
-- user never gets a token and receives no push. This function lets the
-- signed-in user take over a token, which is always correct: a token lives on
-- exactly one device, and that device is now theirs.

create or replace function public.register_device_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  insert into public.device_tokens (user_id, token, platform)
  values (auth.uid(), p_token, p_platform)
  on conflict (token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        updated_at = now();
end;
$$;

revoke all on function public.register_device_token(text, text) from public;
grant execute on function public.register_device_token(text, text) to authenticated;
