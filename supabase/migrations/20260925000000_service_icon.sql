-- gates-admin: services catalog icon
-- Each service tag (WiFi, toallas...) picks an icon name from the curated
-- set in src/lib/serviceIcons.ts (a @tabler/icons-react component name),
-- rendered next to it in the services picker and manager.

alter table public.services
  add column if not exists icon text;
