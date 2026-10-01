-- gates-admin: seed global providers catalog
-- Common proveedor/delivery/paquetería entries every residential sees on
-- top of whatever extras they add themselves, mirroring the global
-- services seed in 20260926000000_global_services.sql.

insert into public.providers (residential_id, name, kind, is_active)
values
  (null, 'Aire acondicionado', 'proveedor', true),
  (null, 'Electricidad', 'proveedor', true),
  (null, 'Control de plagas', 'proveedor', true),
  (null, 'Gas', 'proveedor', true),
  (null, 'Jardinería', 'proveedor', true),
  (null, 'Plomería', 'proveedor', true),
  (null, 'PedidosYa', 'delivery', true),
  (null, 'Hugo', 'delivery', true),
  (null, 'Bipbip', 'delivery', true),
  (null, 'Speedy', 'delivery', true),
  (null, 'Punto Farma', 'delivery', true),
  (null, 'DHL', 'paqueteria', true),
  (null, 'Cargo Expreso', 'paqueteria', true),
  (null, 'C807', 'paqueteria', true),
  (null, 'Rapi Envíos', 'paqueteria', true),
  (null, 'El Corso', 'paqueteria', true)
on conflict do nothing;
