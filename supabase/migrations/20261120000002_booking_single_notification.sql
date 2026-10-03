-- gates-admin: one notification per confirmed booking.
-- Confirming a paid booking used to produce "Reserva confirmada" plus "Nuevo
-- cobro" (the installment the booking creates). Now:
--  * installments that belong to a booking never notify as a new charge;
--  * "Reserva confirmada" carries the amount and due date of that installment.
-- Trigger order matters: amenity_bookings_installment sorts before
-- notify_booking_status, so the installment already exists when the
-- confirmation body is built.

create or replace function public.notify_new_installment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_charge text;
begin
  if new.booking_id is not null
     or new.status <> 'pending' or new.paid_amount > 0 or new.due_date < current_date then
    return new;
  end if;

  select name into v_charge from public.charges where id = new.charge_id;

  insert into public.user_notifications (user_id, residential_id, type, title, body, data)
  select
    m.user_id,
    new.residential_id,
    'charge',
    'Nuevo cobro',
    format(
      '%s: $%s, vence el %s.',
      coalesce(v_charge, 'Cobro'),
      to_char(new.base_amount, 'FM999,999,990.00'),
      to_char(new.due_date, 'DD/MM/YYYY')
    ),
    jsonb_build_object('type', 'charge', 'unit_id', new.unit_id, 'residential_id', new.residential_id)
  from public.unit_members m
  where m.unit_id = new.unit_id;
  return new;
end;
$$;

alter function public.notify_new_installment() owner to postgres;

create or replace function public.notify_booking_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amenity text;
  v_amount numeric;
  v_due date;
  v_body text;
begin
  if new.status is not distinct from old.status
     or new.status not in ('confirmed', 'cancelled')
     or auth.uid() is not distinct from new.user_id then
    return new;
  end if;

  select name into v_amenity from public.amenities where id = new.amenity_id;

  if new.status = 'confirmed' then
    v_body := format('Tu reserva de %s fue confirmada.', coalesce(v_amenity, 'la amenidad'));

    select base_amount, due_date into v_amount, v_due
    from public.charge_installments
    where booking_id = new.id and status in ('pending', 'partial');

    if v_amount is not null then
      v_body := v_body || format(
        ' Cobro: $%s, vence el %s.',
        to_char(v_amount, 'FM999,999,990.00'),
        to_char(v_due, 'DD/MM/YYYY')
      );
    end if;
  else
    v_body := format('Tu reserva de %s fue cancelada.', coalesce(v_amenity, 'la amenidad'));
  end if;

  insert into public.user_notifications (user_id, residential_id, type, title, body, data)
  values (
    new.user_id,
    new.residential_id,
    'booking',
    case new.status when 'confirmed' then 'Reserva confirmada' else 'Reserva cancelada' end,
    v_body,
    jsonb_build_object('type', 'booking', 'booking_id', new.id, 'residential_id', new.residential_id)
  );
  return new;
end;
$$;

alter function public.notify_booking_status() owner to postgres;
