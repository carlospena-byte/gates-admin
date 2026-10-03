-- gates-admin: bulk payment import
-- import_charge_payments() validates (and, unless _dry_run, records) a list of
-- payments in one transaction. Each row is resolved to an installment either
-- by id or by unit name + charge name + period, and checked for amount,
-- balance, state and duplicates. Invalid rows never abort the batch: they come
-- back with an error code so the UI can show them and import the rest.
-- Payments of one import share an import_batch_id for traceability.

alter table public.charge_payments
  add column if not exists import_batch_id uuid;

create index if not exists idx_charge_payments_import_batch
  on public.charge_payments (import_batch_id) where import_batch_id is not null;

-- _rows: [{ row, installment_id?, unit?, charge?, period? ('YYYY-MM'),
--           amount?, paid_on?, method?, reference?, notes? }]
-- Returns { batch_id, results: [{ row, ok, error?, installment_id?, amount?, payment_id? }],
--           payment_ids: [uuid] }.
create or replace function public.import_charge_payments(
  _residential_id uuid,
  _rows jsonb,
  _dry_run boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c_max_rows constant int := 500;
  v_batch uuid := gen_random_uuid();
  v_item jsonb;
  v_results jsonb := '[]'::jsonb;
  v_payment_ids jsonb := '[]'::jsonb;
  -- Amounts already accepted in this batch per installment, and dedup keys,
  -- so rows are validated against each other as well as against the table.
  v_added jsonb := '{}'::jsonb;
  v_seen jsonb := '{}'::jsonb;
  v_row int;
  v_inst public.v_charge_installments%rowtype;
  v_inst_id uuid;
  v_matches int;
  v_amount numeric;
  v_paid_on date;
  v_method text;
  v_reference text;
  v_period date;
  v_key text;
  v_remaining numeric;
  v_error text;
  v_payment_id uuid;
begin
  if not (public.is_platform_admin() or public.is_residential_admin(_residential_id)) then
    raise exception 'not authorized';
  end if;
  if jsonb_typeof(_rows) <> 'array' then
    raise exception 'rows must be an array';
  end if;
  if jsonb_array_length(_rows) > c_max_rows then
    raise exception 'too many rows (max %)', c_max_rows;
  end if;

  for v_item in select * from jsonb_array_elements(_rows) loop
    v_error := null;
    v_inst_id := null;
    v_row := coalesce((v_item->>'row')::int, 0);

    begin
      -- 1. Resolve the installment.
      if nullif(v_item->>'installment_id', '') is not null then
        select * into v_inst from public.v_charge_installments
         where id = (v_item->>'installment_id')::uuid and residential_id = _residential_id;
        if not found then v_error := 'installment_not_found'; end if;
      else
        if nullif(v_item->>'unit', '') is null
           or nullif(v_item->>'charge', '') is null
           or nullif(v_item->>'period', '') is null then
          v_error := 'installment_not_found';
        else
          v_period := ((v_item->>'period') || '-01')::date;
          select count(*) into v_matches from public.v_charge_installments
           where residential_id = _residential_id
             and period = v_period
             and lower(btrim(unit_name)) = lower(btrim(v_item->>'unit'))
             and lower(btrim(charge_name)) = lower(btrim(v_item->>'charge'));
          if v_matches = 0 then
            v_error := 'installment_not_found';
          elsif v_matches > 1 then
            v_error := 'installment_ambiguous';
          else
            select * into v_inst from public.v_charge_installments
             where residential_id = _residential_id
               and period = v_period
               and lower(btrim(unit_name)) = lower(btrim(v_item->>'unit'))
               and lower(btrim(charge_name)) = lower(btrim(v_item->>'charge'));
          end if;
        end if;
      end if;

      -- 2. Validate state, amount, date, method.
      if v_error is null then
        v_inst_id := v_inst.id;
        -- A dry run inserts nothing, so earlier rows of this batch are only
        -- known through v_added; a real run reads them back from the table.
        v_remaining := v_inst.balance
          - case when _dry_run then coalesce((v_added->>(v_inst.id::text))::numeric, 0) else 0 end;
        v_amount := coalesce(nullif(v_item->>'amount', '')::numeric, v_remaining);
        v_paid_on := coalesce(nullif(v_item->>'paid_on', '')::date, current_date);
        v_method := nullif(v_item->>'method', '');
        v_reference := nullif(btrim(coalesce(v_item->>'reference', '')), '');

        v_key := concat_ws('|', v_inst.id, v_amount, v_paid_on, coalesce(v_reference, ''));

        if v_inst.status = 'cancelled' then
          v_error := 'installment_cancelled';
        elsif v_seen ? v_key or exists (
          -- Same installment/amount/date/reference, already stored or earlier
          -- in this file: re-uploading a file reports duplicates, not a
          -- confusing balance error.
          select 1 from public.charge_payments p
           where p.installment_id = v_inst.id
             and p.amount = v_amount
             and p.paid_on = v_paid_on
             and coalesce(p.reference, '') = coalesce(v_reference, '')
        ) then
          v_error := 'duplicate';
        elsif v_remaining <= 0 then
          v_error := 'already_paid';
        elsif v_amount <= 0 then
          v_error := 'invalid_amount';
        elsif v_amount > v_remaining then
          v_error := 'exceeds_balance';
        elsif v_method is not null and v_method not in ('cash', 'transfer', 'check', 'other') then
          v_error := 'invalid_method';
        end if;
      end if;
    exception when others then
      -- Malformed number/date/uuid in one row must not sink the batch.
      v_error := 'invalid_value';
    end;

    if v_error is not null then
      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'row', v_row, 'ok', false, 'error', v_error, 'installment_id', v_inst_id));
      continue;
    end if;

    v_added := jsonb_set(v_added, array[v_inst_id::text],
      to_jsonb(coalesce((v_added->>(v_inst_id::text))::numeric, 0) + v_amount));
    v_seen := v_seen || jsonb_build_object(v_key, true);
    v_payment_id := null;

    if not _dry_run then
      insert into public.charge_payments
        (residential_id, installment_id, amount, paid_on, method, reference, notes, created_by, import_batch_id)
      values
        (_residential_id, v_inst_id, v_amount, v_paid_on, v_method, v_reference,
         nullif(btrim(coalesce(v_item->>'notes', '')), ''), auth.uid(), v_batch)
      returning id into v_payment_id;
      v_payment_ids := v_payment_ids || to_jsonb(v_payment_id);
    end if;

    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'row', v_row, 'ok', true, 'installment_id', v_inst_id, 'amount', v_amount, 'payment_id', v_payment_id));
  end loop;

  return jsonb_build_object('batch_id', v_batch, 'results', v_results, 'payment_ids', v_payment_ids);
end;
$$;

revoke all on function public.import_charge_payments(uuid, jsonb, boolean) from public;
grant execute on function public.import_charge_payments(uuid, jsonb, boolean) to authenticated;
