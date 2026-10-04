-- gates-app: residents can read the billing of their own unit(s).
--
-- charge_installments / charge_payments were admin-only (a resident must not
-- see other units' balances). The mobile app now shows each resident their
-- unit's outstanding balance and payment history, so a resident gets SELECT
-- on the rows of units they belong to (unit_members) — and nothing else.
-- v_charge_installments is security_invoker, so it inherits this scoping.

create or replace function public.is_unit_member(_unit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.unit_members um
    where um.unit_id = _unit_id and um.user_id = auth.uid()
  );
$$;

revoke all on function public.is_unit_member(uuid) from public, anon;
grant execute on function public.is_unit_member(uuid) to authenticated;

drop policy if exists "charge_installments: unit members view" on public.charge_installments;
create policy "charge_installments: unit members view"
  on public.charge_installments for select to authenticated
  using (public.is_unit_member(unit_id));

drop policy if exists "charge_payments: unit members view" on public.charge_payments;
create policy "charge_payments: unit members view"
  on public.charge_payments for select to authenticated
  using (
    exists (
      select 1 from public.charge_installments i
      where i.id = charge_payments.installment_id
        and public.is_unit_member(i.unit_id)
    )
  );
