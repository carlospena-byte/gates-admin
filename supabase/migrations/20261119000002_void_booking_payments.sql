-- gates-admin: void the payments of a cancelled paid booking from its
-- notification, with a comment.
--
-- Payments are plain rows (charge_payments), so voiding one deletes it and the
-- reason would be lost. This RPC does the whole thing in one place: checks the
-- caller administers the alert's residential, deletes the installment's
-- payments (existing triggers recompute it and, because the booking is
-- cancelled, cancel the installment and resolve the alert), then records who
-- voided and why on the alert and on the installment's notes. The payment rows
-- themselves stay in the audit log (audit_charge_payments).

alter table public.admin_alerts
  add column if not exists resolution_note text,
  add column if not exists resolved_by uuid references public.profiles(user_id) on delete set null;

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
  if v_note is null then
    raise exception 'A comment is required' using errcode = '22023';
  end if;

  delete from public.charge_payments where installment_id = v_alert.installment_id;
  get diagnostics v_count = row_count;

  update public.charge_installments
  set notes = concat_ws(E'\n', nullif(notes, ''), '[Pago anulado] ' || v_note)
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
