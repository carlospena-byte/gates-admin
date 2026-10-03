-- gates-admin: the comment when voiding a paid booking's payments is optional.
-- Replaces void_booking_payments (20261119000002), which required it.

create or replace function public.void_booking_payments(_alert_id uuid, _note text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alert public.admin_alerts%rowtype;
  v_note text := nullif(trim(_note), '');
  v_count integer;
begin
  select * into v_alert from public.admin_alerts where id = _alert_id;
  if not found then
    raise exception 'Notification not found' using errcode = 'P0002';
  end if;

  if not (is_platform_admin() or is_residential_admin(v_alert.residential_id)) then
    raise exception 'Only residential admins can void payments' using errcode = '42501';
  end if;
  if v_alert.kind <> 'booking_cancelled_paid' or v_alert.installment_id is null then
    raise exception 'This notification has no payments to void' using errcode = '22023';
  end if;

  delete from public.charge_payments where installment_id = v_alert.installment_id;
  get diagnostics v_count = row_count;

  update public.charge_installments
  set notes = concat_ws(E'\n', nullif(notes, ''), '[Pago anulado]' || coalesce(' ' || v_note, ''))
  where id = v_alert.installment_id;

  update public.admin_alerts
  set resolution_note = v_note,
      resolved_by = auth.uid(),
      resolved_at = coalesce(resolved_at, now()),
      read_at = coalesce(read_at, now())
  where id = _alert_id;

  return v_count;
end;
$$;

revoke all on function public.void_booking_payments(uuid, text) from public, anon;
grant execute on function public.void_booking_payments(uuid, text) to authenticated;
