-- gates-admin: global services catalog
-- `services` becomes multi-tenant-aware: residential_id NULL means a
-- platform-wide entry every residential sees (WiFi, Alberca, Gimnasio...),
-- managed only by platform admins; a non-null residential_id is that
-- residential's own extra tag, exactly as before. No per-residential
-- "hide this global one" mechanism — if it doesn't apply, admins simply
-- don't pick it when building an amenity.

-- ----------------------------------------------------------------------------
-- Allow a global (residential_id IS NULL) row
-- ----------------------------------------------------------------------------

alter table public.services alter column residential_id drop not null;

-- The old (residential_id, name) unique constraint treats NULLs as
-- distinct, so it wouldn't actually stop two global rows sharing a name.
-- Replace it with two partial unique indexes: one for the global list, one
-- per residential's own extras.
alter table public.services drop constraint if exists services_residential_id_name_key;

create unique index if not exists services_global_name_idx
  on public.services(name) where residential_id is null;

create unique index if not exists services_residential_name_idx
  on public.services(residential_id, name) where residential_id is not null;

-- ----------------------------------------------------------------------------
-- Policies — members must also see the global rows, not just their own
-- residential's; mutation policies are unaffected (is_residential_admin(null)
-- already evaluates false, so the existing "owner admin manage" policy
-- can't touch global rows, and "platform admin all" already covers them).
-- ----------------------------------------------------------------------------

drop policy if exists "services: member select" on public.services;
create policy "services: member select"
  on public.services for select
  to authenticated
  using (residential_id is null or is_residential_member(residential_id));

-- ----------------------------------------------------------------------------
-- Seed the global catalog with common amenity services.
-- ----------------------------------------------------------------------------

insert into public.services (residential_id, name, icon, is_active)
values
  (null, 'WiFi', 'IconWifi', true),
  (null, 'Alberca', 'IconPool', true),
  (null, 'Gimnasio', 'IconBarbell', true),
  (null, 'Estacionamiento', 'IconParking', true),
  (null, 'Áreas verdes', 'IconLeaf', true),
  (null, 'Salón de eventos', 'IconUsers', true),
  (null, 'Asador', 'IconGrill', true),
  (null, 'Sillas', 'IconArmchair', true),
  (null, 'Mesas', 'IconPicnicTable', true),
  (null, 'Sombrillas', 'IconUmbrella', true),
  (null, 'Toallas', 'IconBath', true),
  (null, 'Accesible para silla de ruedas', 'IconWheelchair', true),
  (null, 'Vigilancia', 'IconDeviceCctv', true),
  (null, 'Acceso controlado', 'IconShieldLock', true),
  (null, 'Elevador', 'IconElevator', true),
  (null, 'Área de juegos infantiles', 'IconBabyCarriage', true),
  (null, 'Pet friendly', 'IconDog', true),
  (null, 'Cancha de tenis', 'IconBallTennis', true),
  (null, 'Cancha de básquetbol', 'IconBallBasketball', true),
  (null, 'Cancha de fútbol', 'IconSoccerField', true),
  (null, 'Sala de cine', 'IconMovie', true),
  (null, 'Sala de juegos', 'IconDice', true),
  (null, 'Yoga', 'IconYoga', true),
  (null, 'Bicicletas', 'IconBike', true),
  (null, 'Lavandería', 'IconWashMachine', true),
  (null, 'Cocina equipada', 'IconToolsKitchen2', true),
  (null, 'Aire acondicionado', 'IconAirConditioning', true),
  (null, 'Business center', 'IconDesk', true),
  (null, 'Bodega', 'IconBuildingWarehouse', true),
  (null, 'Zona de asoleadero', 'IconSun', true)
on conflict do nothing;
