-- gates-admin: payment proofs
-- Adds a private Storage bucket for rental payment receipts, plus the
-- proof/validation columns on unit_rental_payments. This is the project's
-- first Storage bucket — no bucket existed anywhere before this migration.

-- ----------------------------------------------------------------------------
-- Storage bucket (private — never public; access is via signed URL only)
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- unit_rental_payments: proof + validation columns
-- ----------------------------------------------------------------------------

alter table public.unit_rental_payments
  add column if not exists proof_url text,
  add column if not exists validated_by uuid references public.profiles(user_id) on delete set null,
  add column if not exists validated_at timestamptz;

alter table public.unit_rental_payments drop constraint if exists unit_rental_payments_status_check;
alter table public.unit_rental_payments
  add constraint unit_rental_payments_status_check
  check (status in ('pending', 'paid', 'overdue', 'cancelled', 'rejected'));

-- ----------------------------------------------------------------------------
-- Storage RLS
-- Objects are stored at "{residential_id}/{payment_id}-{timestamp}.{ext}" —
-- storage.foldername(name) splits that path, so element [1] is the
-- residential_id segment. Reuses the same is_residential_admin()/
-- is_platform_admin() helpers every other table's RLS uses. Owner/admin
-- only — payment proofs are a financial concern, not exposed to
-- security/member like the visitors_security.sql tables were.
-- ----------------------------------------------------------------------------

drop policy if exists "payment_proofs: platform admin all" on storage.objects;
create policy "payment_proofs: platform admin all"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'payment-proofs' and is_platform_admin())
  with check (bucket_id = 'payment-proofs' and is_platform_admin());

drop policy if exists "payment_proofs: owner admin select" on storage.objects;
create policy "payment_proofs: owner admin select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'payment-proofs'
    and is_residential_admin((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "payment_proofs: owner admin insert" on storage.objects;
create policy "payment_proofs: owner admin insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'payment-proofs'
    and is_residential_admin((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "payment_proofs: owner admin delete" on storage.objects;
create policy "payment_proofs: owner admin delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'payment-proofs'
    and is_residential_admin((storage.foldername(name))[1]::uuid)
  );
