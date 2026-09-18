# Admin Web Audit

**Proyecto:** gates-admin — Admin Web para plataforma de administración residencial/condominios
**Stack:** React 19.2 + Vite 7 + TypeScript 5.9 (strict) + Tailwind + Supabase (Postgres/Auth/RLS)
**Fecha de auditoría:** 2026-09-07
**Alcance:** Solo lectura. No se modificó código, no se ejecutaron migraciones, no se tocó Supabase.

---

## 1. Executive Summary

**Estado general:** este es un proyecto **real, activo y técnicamente sólido**, pero cubre hoy únicamente la mitad "property management" del producto deseado (unidades, rentas, cargos, addons/parqueos, ubicaciones jerárquicas). La mitad que le da nombre al producto — **"Gates" como control de acceso** (visitantes, vehículos, bitácora de acceso, seguridad física) — **no existe en absoluto**, ni en base de datos ni en frontend. Tampoco existen Incidencias, Comunicados ni Reportes. El Dashboard, Amenidades y Configuración están parcialmente construidos.

**Cumplimiento aproximado del MVP solicitado (10 módulos):** **~35-40%**.
- Completos o casi completos: Properties (como "Units"), Settings (parcial), autenticación/multi-tenancy/RLS (backend).
- Parciales: Dashboard, Residents (existe el dato, no la superficie de gestión), Amenities (CRUD básico, sin reservas), Payments (existe para rentas, no es un módulo de "cargos + comprobantes" completo).
- Inexistentes: Visitors, Incidents, Announcements, Security (como módulo), Reports.

**Principales fortalezas:**
- **Arquitectura de servicios limpia**: ningún componente llama a Supabase directamente (`grep` confirma cero llamadas fuera de `src/services`); todo pasa por un patrón `ApiResult<T>` consistente (éxito/error tipado, sin `throw` hacia el llamador).
- **RLS realmente implementado y correcto**: cada tabla tiene RLS habilitado, con funciones `SECURITY DEFINER` (`is_platform_admin`, `is_residential_owner`, `is_residential_admin`, `is_residential_member`) que evitan la recursión de políticas y aíslan correctamente por `residential_id`. No se encontró ninguna política `USING (true)` ni tabla expuesta sin políticas.
- **Ninguna key insegura en el frontend**: el cliente usa `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key), nunca `service_role`. El único uso de `service_role` es en `scripts/seed-dev-users.sh`, leído dinámicamente de `supabase status` en local — no hardcodeado ni comprometido en git.
- **Disciplina de tipado alta**: TypeScript `strict: true` + `noUnusedLocals/Parameters`; solo **una** ocurrencia real de `any` en todo `src/` (documentada y justificada en `createCrudService.ts`).
- **Sin secretos filtrados**: revisión de `git log --all --full-history` confirma que nunca se commiteó un `.env` real, solo los `.example`.

**Principales riesgos:**
- **Brecha funcional crítica**: el producto se llama "Gates" pero no hay ninguna tabla ni pantalla de visitantes, vehículos, bitácora de acceso o gates físicos. El rol `security` ya existe en la base de datos (`residential_users.role`, función `is_residential_security()`) pero **no se usa en ninguna política** ni tiene ninguna pantalla — es un rol fantasma.
- **Cero almacenamiento de archivos**: no existe ningún bucket de Supabase Storage declarado. Sin esto, no se pueden subir comprobantes de pago, fotos de incidencias, logos de residencial ni fotos de perfil — funcionalidad que el MVP requiere.
- **Historial de RLS frágil**: los documentos internos (`docs/RLS_AUTH_FIX.md` vs `docs/RLS_FIXES_SUMMARY.md`) muestran una reversión completa de estrategia en 24 horas (de "nunca uses SECURITY DEFINER" a "usa SECURITY DEFINER en todo"), y un patrón repetido de tablas con RLS habilitado pero sin políticas. Hoy está estable, pero **no hay tests ni CI** que impidan que se repita con la próxima tabla nueva.
- **Sin gestión de usuarios/roles en la UI**: pese a que el backend soporta invitar admins/seguridad/miembros (`residential_users` con RLS completo), **no existe ninguna pantalla** para invitar, cambiar de rol o remover usuarios de una residencial. Solo se listan (solo lectura) en el dashboard.
- **Navegación no refleja el IA objetivo**: el sidebar actual solo tiene *Dashboard*, *Units*, *Settings* — ninguno de los otros 7 módulos solicitados aparece en la navegación, aunque algunos datos ya existan parcialmente en el backend.

---

## 2. Existing Architecture

- **Framework:** React 19.2 + Vite 7, TypeScript 5.9 con `strict: true` y flags adicionales (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`). Alias `@/* → ./src/*`.
- **Routing:** **no usa React Router**. Es un router custom por hash (`src/config/routes.ts` + `window.location.hash`), con un `App.tsx` que resuelve la pantalla activa mediante una larga cadena de `if`. El objeto `ROUTES` declara metadata (`requiresAuth`, `requiresPlatformAdmin`, `requiresResidentialAccess`) que **no se usa en ningún lado** — la protección real ocurre a mano en `App.tsx`, no a través de esa configuración (código muerto/documentación desincronizada).
- **Estado global:** no hay Redux/Zustand/Context store. Dos hooks (`useSession`, `useAccess`) resuelven sesión y rol/tenant en cada punto de entrada; sin caché ni contexto compartido — cada componente que los usa dispara sus propias queries.
- **Formularios:** manuales, con `useState` + validación inline (`src/lib/validation.ts`). No hay `react-hook-form` ni `zod` en uso real (zod es una dependencia transitiva sin uso).
- **UI library:** shadcn/ui-style sobre Radix UI + Tailwind (`components.json` confirma shadcn). 18 primitivos en `src/components/ui/`: table, dialog, sheet, dropdown-menu, select, tabs, badge, input, button, card, popover, command (combobox), input-otp, skeleton, alert, sidebar, switch. **Faltan:** checkbox, radio, textarea, date-picker/calendar, tooltip, accordion, un componente `empty-state` genérico y un `DataTable` reutilizable (cada tabla reimplementa el mismo cableado de orden/paginación).
- **Tablas:** patrón compartido `usePaginatedSortedData` (orden + paginación **100% client-side**, sobre el arreglo completo ya descargado) + `SortableTableHead`/`Pagination`. No hay paginación server-side (`.range()`) en ningún servicio.
- **Modales/Sheets:** el patrón dominante y más reciente es **Sheet** (panel lateral) para crear/editar — confirmado como convención activa (el commit más reciente del repo migra edición inline a Sheet). `Dialog` se usa para casos simples (ej. Amenities).
- **Notificaciones:** `sonner` (Toaster montado en `App.tsx`), usado consistentemente para éxito/error de mutaciones.
- **Autenticación:** Supabase Auth, **passwordless / OTP por email** (sin contraseñas, por lo tanto sin "recuperar contraseña" — es una decisión de diseño válida, no un hueco). Sesión persistida vía el almacenamiento default de `@supabase/supabase-js` (localStorage).
- **Autorización:** basada en 2 tablas (`platform_admins`, `residential_users`) consultadas desde `useAccess`, y **reforzada en el servidor vía RLS** (no depende solo de la UI — verificado leyendo las políticas). Roles: `platform_admin` (global) y `owner`/`admin`/`security`/`member` (por residencial). Es un RBAC **coarse**: `canManageResidential(role)` solo distingue "puede gestionar" (`owner`/`admin`) de "solo lectura" (`security`/`member`) — no hay permisos granulares por feature.
- **Integración con Supabase:** un único cliente tipado (`src/lib/supabaseClient.ts`) desde `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`. `service_role` nunca aparece en `src/`.
- **Manejo de errores:** patrón `ApiResult<T>` (`{success:true,data} | {success:false,error}`) centralizado en `src/services/apiResult.ts`; ningún servicio lanza excepciones al llamador.
- **Variables de entorno:** correctamente separadas por ambiente (`.env.development/staging/production`), solo variables `VITE_*` seguras para el bundle; `RESEND_API_KEY` (para Edge Functions) no lleva prefijo `VITE_`, por lo que no se expone al cliente.
- **TypeScript/Lint:** `tsconfig.app.json` muy estricto; `eslint.config.js` flat config estándar (recommended, no type-checked-strict) sin reglas custom; 18 `// eslint-disable` puntuales, casi todos para el único patrón `any` intencional o para `exhaustive-deps` en efectos bien documentados.
- **Fetching/caché:** hooks propios `useAsync`/`useQuery` (sin caché, sin dedupe, refetch en cada montaje) + un patrón repetido a mano ("ManagerData hooks") que reimplementa parcialmente lo que daría gratis TanStack Query. **No hay React Query ni SWR.**
- **Uploads:** **no implementado en absoluto** — cero buckets de Storage declarados en `supabase/config.toml` ni en las migraciones.
- **Realtime:** **cero suscripciones** (`grep` de `channel(`/`postgres_changes`/`.subscribe(` da 0 resultados fuera de `onAuthStateChange`). Todo es fetch-on-mount.
- **Roles y permisos:** modelo de 4+1 niveles (`owner`, `admin`, `security`, `member`, más `platform_admin` global), sin tabla de permisos granulares.

**Problemas identificados (arquitectura):**
- Componentes de tamaño razonable (máx. 410 líneas, `UnitDetailPage.tsx`) — no hay "God components" por tamaño, aunque `UnitDetailPage.tsx` concentra bastante responsabilidad (estado de borrador, guardar/cancelar, orquestación de 3 sub-paneles).
- Código muerto detectado: `src/components/auth/AuthLayout.tsx` (nunca importado), `src/hooks/useResidentials.ts` y `useUnits.ts` (sin call-sites, reemplazados por los hooks "ManagerData"), las funciones `requiresAuth()/requiresPlatformAdmin()/requiresResidentialAccess()/getRoute()` de `routes.ts`, y `src/types/database.types.ts.bak` (backup obsoleto).
- i18n (en/es) con infraestructura sólida pero **cobertura inconsistente**: `App.tsx`/`LoginPage.tsx` totalmente traducidos vía `t()`; los módulos más nuevos (`units`, `addons`, `charges`, `ResidentialDashboardPage`) tienen strings en inglés hardcodeados, y `ResidentialSignupPage.tsx` incluso mezcla literales en español ("Edificio", "Bloque") en datos semilla junto a UI en inglés.
- Responsive: el "shell" de navegación es responsive (sidebar colapsable, breakpoints `lg:`/`sm:`), pero el contenido (tablas, formularios multi-columna, secciones de detalle) es mayormente fijo para desktop — solo ~42% de los archivos usan algún prefijo responsive, y las tablas no tienen fallback tipo "card" en mobile.
- Loading states consistentes (`TableSkeleton`/`Spinner` reutilizados); empty states presentes pero con estilos duplicados en vez de un componente único; error states siguen una convención razonable (Alert para errores de lectura, toast para errores de mutación) pero no está forzada por ningún wrapper compartido.

---

## 3. Existing Features

| Module | Status | Notes |
|---|---|---|
| Dashboard | 🟡 PARTIAL | Muestra tarjetas de Units/Users/Amenities con conteos, sin "necesita atención" ni feed de actividad visible (el audit log existe pero vive en otra pantalla). Sin visitas/incidencias/pagos porque esos módulos no existen. |
| Properties (Units) | ✅ COMPLETE (para MVP) | El módulo más maduro: lista con tabla, sheet de creación, página de detalle con secciones (General, Add-ons, Residents, Charges, Rentals). Falta paginación server-side y bulk actions. |
| Residents | 🟡 PARTIAL | Existen `unit_residents` (contactos, sin login) y `unit_members` (usuarios con cuenta), gestionables **dentro** del detalle de una unidad. **No existe una vista global de "Residentes"** (lista transversal con búsqueda/filtro por residencial) — solo por unidad. |
| Visitors / Security | 🔴 MISSING | No existe tabla `visitors`, `vehicles`, `access_logs` ni ninguna pantalla. El rol `security` existe en RLS pero no tiene ninguna política ni pantalla propia — es un rol sin funcionalidad. |
| Amenities | 🟡 PARTIAL | CRUD mínimo (nombre/descripción/activo) embebido directamente en `ResidentialDashboardPage.tsx`, sin página ni "Manager" dedicado. La tabla `amenity_bookings` (reservas) existe en el esquema con **cero uso** en servicios/hooks/UI. |
| Payments / Finance | 🟡 PARTIAL | Existen `charges`+`unit_charges` (cargos recurrentes por unidad) y `unit_rentals`+`unit_rental_payments` (pagos de renta con estado pending/paid/overdue/cancelled). **No hay** comprobantes (`proof_url`), validación admin (`validated_by/at`), ni un estado de cuenta consolidado por propiedad que combine ambos sistemas. |
| Incidents | 🔴 MISSING | Ninguna tabla, servicio ni pantalla. |
| Announcements | 🔴 MISSING | Ninguna tabla, servicio ni pantalla. |
| Security (módulo) | 🔴 MISSING | No hay gates/puntos de acceso, ni bitácora de accesos físicos (el `audit_logs` existente es una bitácora de mutaciones de BD, no de accesos físicos). |
| Reports | 🔴 MISSING | Ninguna pantalla de reportes ni exportación CSV. |
| Settings | 🟡 PARTIAL | Cubre Unit Types, Location Types, Addon Types, Locations, Addons (todos con CRUD completo). **Falta:** editar perfil de la residencial (nombre/logo/dirección/timezone — los campos existen en la tabla `residentials` pero no hay formulario), y **gestión de usuarios/roles** (el servicio existe y el RLS lo soporta, pero no hay ninguna pantalla para invitar/editar/remover admins, seguridad o miembros). |
| Auth / Multi-tenancy | ✅ COMPLETE | OTP login/logout, sesión persistente, aislamiento por `residential_id` reforzado en RLS, autoservicio de alta de nueva residencial (`ResidentialSignupPage`). Sin selector de residencial cuando un usuario pertenece a más de una (toma la primera creada). |
| Platform Admin Dashboard | 🟡 PARTIAL | Lista todas las residenciales con su owner; el botón "Open" solo guarda el id seleccionado en estado local — **no navega a ninguna vista real** de esa residencial. |

---

## 4. Supabase Architecture

### Auth
- Passwordless (OTP de 6 dígitos por email), `enable_signup = true` (autoservicio de alta), `enable_confirmations = false` (el OTP hace de confirmación), MFA deshabilitado, sin proveedores OAuth de terceros.
- `jwt_expiry = 3600`, rotación de refresh token habilitada.
- SMTP local vía Mailpit (dev); plantilla de magic link personalizada para mostrar el código de 6 dígitos en vez de un link.
- `[auth.rate_limit] email_sent = 2` por hora — valor de desarrollo muy restrictivo; **verificar que no sea el valor real en el proyecto hosted**, pues bloquearía logins en producción.
- `minimum_password_length = 6`, sin reglas de complejidad — irrelevante en la práctica porque no se usan contraseñas, pero si algún día se habilita login con password quedaría débil por defecto.

### Database (23 tablas, confirmado línea por línea en `supabase/migrations/20260101000000_baseline.sql`)
`profiles`, `platform_admins`, `residentials`, `residential_users`, `unit_types`, `addon_types`, `addons`, `addon_items`, `location_types`, `locations`, `locations_backup`, `units`, `unit_members`, `unit_addons`, `unit_residents`, `unit_rentals`, `unit_rental_payments`, `charges`, `unit_charges`, `amenities`, `amenity_bookings`, `audit_logs`, más la vista `location_hierarchy`.

Todas las tablas "de negocio" tienen columna `residential_id` (tenant scoping consistente); las excepciones correctas son `profiles`/`platform_admins` (globales) y `unit_members`/`unit_addons` (heredan el tenant vía `unit_id`).

### RLS
- **RLS habilitado en las 22 tablas**, sin excepción, verificado línea por línea.
- **No se encontró ninguna política `USING (true)`** ni tabla con RLS habilitado y cero políticas (el patrón de bug histórico documentado en `docs/RLS_FIXES_SUMMARY.md` no está presente hoy).
- Modelo de 5 funciones `SECURITY DEFINER` con `search_path` fijado a `public` (mitiga search_path hijacking): `is_platform_admin()`, `is_residential_owner(uuid)`, `is_residential_admin(uuid)`, `is_residential_security(uuid)`, `is_residential_member(uuid)`. Son de solo lectura, reciben `uuid` tipado (no interpolación de texto → sin riesgo de inyección), y existen precisamente para evitar la recursión de políticas al consultar `residential_users` desde sus propias políticas.
- **Hallazgo relevante:** `is_residential_security()` está definida y con `GRANT EXECUTE`, pero **no la usa ninguna política** — el rol `security` cae bajo las políticas genéricas de "member" (solo lectura de units/amenities/etc.), sin ninguna vista diferenciada. Confirma que el rol fue anticipado pero nunca conectado a ninguna funcionalidad real.
- `audit_logs` es de solo lectura para la app (sin política de insert/update/delete) — solo el trigger `SECURITY DEFINER` `log_audit_event()` puede escribir. Buen diseño "tamper-evident".
- `locations_backup` (tabla legacy) está bloqueada a solo `select` para `platform_admin`.
- No se auditó individualmente cada cláusula `USING`/`WITH CHECK` en busca de bypass sutiles (fuera del alcance de este pase), pero el patrón es consistente y no se detectó ningún caso obvio de sobre-permisividad.

### Storage
- **No existe ningún bucket declarado.** `supabase/config.toml` tiene el bloque de buckets comentado; no hay `insert into storage.buckets` en ninguna migración; no hay políticas de `storage.objects`. Ningún archivo de frontend usa `supabase.storage`.
- Consecuencia directa: comprobantes de pago, fotos de incidencias, logos de residencial y fotos de perfil **no tienen dónde vivir hoy**.

### Realtime
- No usado en ningún lado (cero canales `postgres_changes`).

### Edge Functions / RPC
- Solo existe `supabase/functions/health/index.ts`, un healthcheck trivial sin lógica de negocio, sin acceso a BD ni a secretos. No hay RPCs custom (`create or replace function` fuera de las utilitarias/RLS ya descritas) ni Edge Functions para email transaccional (`RESEND_API_KEY` está previsto en `.env` pero no hay ninguna función que lo use todavía).

### Migraciones
- **Una sola migración** (`20260101000000_baseline.sql`, 1323 líneas) — aceptable para un proyecto joven, pero `supabase/schema.sql` es una copia casi idéntica (difiere en un comentario) mantenida a mano en paralelo. Riesgo de drift si se edita una sin la otra; recomendable eliminar `schema.sql` o generarlo automáticamente desde las migraciones.

---

## 5. Database Gap Analysis

| Requirement | Existing | Gap | Recommendation |
|---|---|---|---|
| Communities/Residentials | `public.residentials` (id, name, owner_user_id, plan_type, is_active, address, lat/lng) | Sin `logo_url` ni `timezone` | Agregar columnas `logo_url text`, `timezone text default 'UTC'` |
| Properties | `public.units` (id, residential_id, name, unit_type_id, location_id, owner_user_id, price, is_active) | Sin `building/tower` explícito (se resuelve vía `location_id` jerárquico) — correcto por diseño, no es un gap real | Ninguna — el modelo de `locations` ya cubre esto mejor que una columna plana |
| Residents (owner/tenant/family/other) | `unit_members` (usuarios con cuenta) + `unit_residents` (contacto sin cuenta) | Sin columna de "tipo de relación" (owner/tenant/family_member/other) en ninguna de las dos tablas | Agregar `relationship_type text check (...)` a `unit_residents` y/o `unit_members` |
| Vehicles | — | Tabla inexistente | Crear `vehicles(id, residential_id, unit_id, resident_id nullable, plate, brand, model, color, created_at)` |
| Visitors | — | Tabla inexistente | Crear `visitors(id, residential_id, unit_id, invited_by, name, phone, plate, valid_from, valid_until, access_code, status, created_at)` con `status` enum (`scheduled/active/inside/completed/cancelled/rejected`) |
| Access Logs | Solo `audit_logs` (bitácora de mutaciones CRUD, no de accesos físicos) | Sin bitácora de entradas/salidas físicas | Crear `access_logs(id, visitor_id, residential_id, gate_id nullable, checked_in_by, checked_in_at, checked_out_by, checked_out_at)` separada del visitante |
| Amenities | `amenities(id, residential_id, name, description, is_active, location, capacity, requires_booking)` | Sin horarios/duración de reserva/política de cancelación/precio/imágenes | Agregar `images text[]`, `booking_duration_minutes int`, `advance_booking_days int`, `cancellation_policy text`, `price numeric` |
| Amenity Schedules/Availability | — | Sin tabla de disponibilidad/horarios | Crear `amenity_schedules(id, amenity_id, day_of_week, start_time, end_time)` o similar |
| Reservations | `amenity_bookings(id, amenity_id, residential_id, user_id, start_time, end_time, status, notes)` — **existe pero sin uso en frontend** | **Sin protección anti-doble-reserva a nivel de BD** (no hay `EXCLUDE` constraint ni unique sobre rango de tiempo) | Agregar `create extension if not exists btree_gist;` + `alter table amenity_bookings add constraint no_overlapping_bookings exclude using gist (amenity_id with =, tsrange(start_time,end_time) with &&) where (status <> 'cancelled')` — **no confiar solo en el frontend** |
| Charges | `charges` + `unit_charges` (catálogo + asignación por unidad con precio) | Sin distinción individual/bulk explícita (bulk se resuelve por UI, no por schema) — aceptable | Ninguna estructural; sí falta UI de asignación masiva |
| Payments | `unit_rental_payments(id, residential_id, rental_id, amount, due_date, paid_at, status, notes)` | **Sin `proof_url`, `validated_by`, `validated_at`** — confirmado por búsqueda exhaustiva en SQL y en `database.types.ts` | Agregar las 3 columnas; requiere bucket de Storage para `proof_url` |
| Incidents | — | Tabla inexistente | Crear `incidents(id, residential_id, unit_id, resident_id nullable, category, title, description, location, priority, status, assigned_to, created_at, resolved_at)` |
| Incident Attachments | — | Tabla inexistente | Crear `incident_attachments(id, incident_id, storage_path, uploaded_by, created_at)` separada del incidente |
| Announcements | — | Tabla inexistente | Crear `announcements(id, residential_id, title, content, category, audience, publish_at, status, created_by, created_at)` |
| Announcement Reads | — | Tabla inexistente | Crear `announcement_reads(announcement_id, user_id, read_at, primary key(announcement_id, user_id))` |
| Admin Roles/Permissions | `residential_users.role` (check: owner/admin/security/member) + `platform_admins` | Sin tabla de permisos granulares por feature | Suficiente para MVP; no crear un sistema de permisos granular hasta que haya una necesidad concreta (evitar sobre-ingeniería) |
| Gates/Access Points | — | Tabla inexistente | Crear `gates(id, residential_id, name, is_active)` como catálogo simple si se requiere registrar por qué puerta entró un visitante |

---

## 6. UX/UI Gap Analysis

- **Navegación:** el sidebar actual (`AppSidebar.tsx`) solo expone *Dashboard*, *Units*, *Settings*. Ninguno de los grupos solicitados (GESTIÓN/OPERACIÓN/CONTROL/SYSTEM) existe como estructura de navegación. Hay que introducir agrupación por secciones en el sidebar existente (el componente ya soporta items con ícono; falta agregar grupos/headers).
- **Patrón "Manager" reutilizable:** el proyecto ya convergió en un patrón consistente y reutilizable (Sheet lateral + tabla paginada/ordenable + `createCrudService`) usado en Units/Locations/Addons/Charges. **Este es el patrón a replicar** para Residents/Visitors/Amenities/Incidents/Announcements — no hay que inventar uno nuevo.
- **Falta un `DataTable` y un `EmptyState` genéricos**: cada módulo nuevo reimplementa el mismo cableado de orden/paginación/estado vacío. Antes de construir 5 módulos nuevos, vale la pena extraer estos dos primitivos una vez (evita duplicar la deuda 5 veces).
- **Falta un layout compartido**: el offset `lg:pl-64` para el sidebar está copiado literalmente en 7+ páginas — un `<AppLayout>` wrapper eliminaría esa duplicación antes de agregar más páginas.
- **Tabs vs. scroll-spy:** `UnitDetailPage` usa scroll-spy con secciones apiladas en vez de tabs reales (aunque existe el primitivo `ui/tabs.tsx`, sin usar todavía en el módulo de referencia). Para Properties (con las tabs pedidas: Overview/Residents/Vehicles/Account/Visitors/Activity) es razonable **migrar a tabs reales** dado que se pide como estructura explícita — no es necesario forzar el patrón scroll-spy actual.
- **Responsive:** el shell de navegación es responsive; el contenido no. Antes de escalar a 10 módulos con tablas, vale la pena decidir una estrategia mínima (scroll horizontal contenido está bien para MVP, pero no hay ni eso consistentemente aplicado).
- **i18n:** si el público es hispanohablante (lo sugiere el seed data: "Torre", "Piso", "Pasaje El Carao"), hay que decidir si los módulos nuevos se construyen ya en `t()` o se acepta seguir en inglés como el resto de módulos recientes — hoy hay inconsistencia real, no una decisión tomada.
- **Gestión de usuarios ausente:** UX crítica faltante — un admin no tiene ninguna forma de invitar a otro admin, a seguridad o a un miembro, pese a que el modelo de datos y RLS ya lo soportan por completo.

---

## 7. Security Findings

| Severidad | Hallazgo |
|---|---|
| **HIGH** | El rol `security` no está conectado a ninguna política RLS ni pantalla — si se construye el módulo de Visitors/Security sin revisar esto, es fácil olvidar exponerle exactamente los datos correctos (ver solo visitantes/accesos, no financieros). Diseñar las políticas de las tablas nuevas (`visitors`, `access_logs`) pensando explícitamente en este rol desde el inicio. |
| **HIGH** | No existe ningún bucket de Storage ni política de `storage.objects`. Cuando se implementen comprobantes de pago/fotos de incidencias, **deben ser buckets privados** con política RLS que solo permita ver el archivo a `is_residential_admin()`/al dueño del registro — nunca públicos por defecto. |
| **MEDIUM** | Historial de inestabilidad en RLS (documentado en `docs/COMPLETE_RLS_FIX.md` vs `docs/RLS_FIXES_SUMMARY.md`, con reversión total de estrategia en 24h) y un patrón repetido de "tabla con RLS habilitado pero sin políticas". Hoy está resuelto, pero no hay ningún test automatizado ni advisor corriendo en CI que detecte si una tabla nueva queda sin políticas. |
| **MEDIUM** | Sin selector de residencial: `useAccess` toma la primera membresía (`order("created_at").limit(1)`) si un usuario pertenece a varias residenciales. No es una falla de aislamiento (RLS sigue protegiendo), pero es una limitación funcional que puede confundirse con un bug de acceso. |
| **LOW** | `[auth.rate_limit] email_sent = 2` por hora en `config.toml` — verificar que este valor de desarrollo no se haya replicado al proyecto de producción, donde bloquearía logins legítimos. |
| **LOW** | `console.log`/`console.warn`/`console.group` de depuración (con IDs de usuario y diagnóstico de RLS) quedaron en `src/state/useAccess.ts` en rutas de código que no están 100% gateadas por `import.meta.env.DEV` (líneas con `console.warn`/`console.error` incondicionales) — no es una fuga de secretos, pero expone detalles internos en la consola de producción. |
| **LOW** | `supabase/schema.sql` duplica manualmente la migración baseline — riesgo de drift, no de seguridad directa, pero puede llevar a aplicar un schema desactualizado si alguien edita el archivo equivocado. |
| **INFORMATIVO** | No se encontró ninguna key `service_role` hardcodeada, ningún `.env` real commiteado, ninguna tabla sin RLS, ninguna política `USING(true)`, ninguna ruta admin alcanzable sin sesión. La superficie de autorización está correctamente anclada en el servidor (RLS), no solo en la UI. |

---

## 8. Performance Findings

- **Sin paginación server-side en ningún servicio**: `createCrudService.list()` y los servicios de `api.service.ts` traen el dataset completo filtrado por `residential_id`/`unit_id` y paginan/ordenan en memoria (`usePaginatedSortedData`). Funciona bien con decenas/cientos de filas por residencial; **se degradará** cuando una residencial tenga miles de unidades, pagos o (a futuro) visitantes/logs de acceso.
- **`select('*')` generalizado**: usado en casi todos los servicios, siempre acotado por `residential_id`/`unit_id` (no es un table-scan sin filtro), pero trae columnas no usadas por la UI en varias vistas de solo-listado.
- **Sin caché ni dedupe de requests**: cada montaje de un hook `useQuery`/`useAsync`/"ManagerData" dispara una consulta nueva; navegar entre pantallas repite trabajo innecesariamente. No hay problema de N+1 clásico (las consultas de relaciones se hacen en lotes vía `Promise.all`, ej. `unitService.listWithRelations`), pero sí de "fetch-again-on-every-visit".
- **`audit_logs` con límite duro de 200 filas** en el cliente (`auditLogService`, no es paginación real) — a medida que crezca la bitácora, los admins dejarán de ver actividad más antigua sin darse cuenta.
- **Índices existentes** (confirmados en la migración): `residential_id` en prácticamente todas las tablas de negocio, más índices puntuales (`parent_id`, `type`, `code`, `owner_user_id`, `table_name`, `created_at desc` en `audit_logs`).
- **Índices recomendados para las tablas nuevas** (no crear todavía, solo referencia para cuando se implementen):
  - `visitors(residential_id)`, `visitors(unit_id)`, `visitors(status)`, `visitors(valid_from, valid_until)`
  - `access_logs(visitor_id)`, `access_logs(checked_in_at)`
  - `incidents(residential_id)`, `incidents(status)`, `incidents(created_at desc)`
  - `announcements(residential_id)`, `announcements(publish_at)`
  - `amenity_bookings(amenity_id, start_time)` (hoy no tiene ningún índice, pese a ya existir en el schema)
- **Recomendación transversal**: `residential_users` no tiene índice sobre `user_id` solo (su PK es compuesta `(residential_id, user_id)`); `useAccess` filtra por `user_id` en cada login — agregar `create index on residential_users(user_id)` sería una mejora barata y de alto impacto.
- **Imágenes**: no aplica todavía (no hay uploads), pero cuando se implementen fotos de amenidades/incidencias, definir desde el inicio un límite de tamaño y, idealmente, un pipeline de resize (Supabase Storage transform o similar) para no repetir el problema más adelante.
- **Realtime**: no hay ninguna suscripción activa hoy, por lo que no hay riesgo actual de exceso de canales — pero al implementarlo (ver sección 18 del prompt original) hay que ser selectivo, no suscribir todo.

---

## 9. MVP Missing Features (priorizadas)

**P0 — bloquea el MVP**
1. Módulo de **Visitors** completo (tabla + RLS + página: Today/Upcoming/Currently Inside/History).
2. Tabla `access_logs` separada del visitante (bitácora de entrada/salida).
3. Conectar el rol `security` a políticas RLS reales sobre las tablas nuevas.
4. Módulo de **Incidents** (tabla + RLS + inbox con estados New/In Progress/Resolved).
5. Bucket de Storage privado + columnas `proof_url/validated_by/validated_at` en `unit_rental_payments` para poder validar comprobantes de pago.

**P1 — necesario para MVP**
6. Módulo de **Announcements** (tabla + RLS + CRUD + publicación programada).
7. Vista global de **Residents** (lista transversal, no solo dentro de una unidad) con acciones invite/activate/suspend.
8. Pantalla de **gestión de usuarios/roles** en Settings (invitar/editar rol/remover — el backend ya lo soporta).
9. Vista de **Reservations** para `amenity_bookings` (ya existe en BD, cero uso) + constraint anti-doble-reserva en BD.
10. Ampliar navegación del sidebar a los 10 módulos con agrupación GESTIÓN/OPERACIÓN/CONTROL/SYSTEM.
11. Dashboard operacional real: visitas de hoy, visitantes dentro, incidencias abiertas, pagos pendientes de validar, monto pendiente de cobro (hoy solo hay conteos vanidosos de Units/Users/Amenities).
12. Estado de cuenta por propiedad que combine `charges`+`unit_charges` y `unit_rentals`+`unit_rental_payments` en un balance único (`balance = cargos - pagos aprobados`), no editable a mano.

**P2 — recomendable**
13. Módulo de **Reports** (visitors/reservations/payments/saldos/incidents con filtros de fecha/estado y export CSV).
14. Selector de residencial para admins que pertenecen a más de una.
15. Completar el CRUD de Amenities como "Manager" dedicado (hoy es un diálogo embebido en el dashboard, incluye horarios/capacidad/precio/imágenes).
16. Editar perfil de la residencial (nombre/logo/dirección/timezone) en Settings — los campos ya existen en la tabla.
17. Terminar la navegación del Platform Dashboard ("Open" hoy no navega a ninguna vista real de la residencial seleccionada).

**P3 — post-MVP**
18. Permisos granulares por feature (más allá de owner/admin/security/member).
19. Realtime para "visitantes dentro ahora" / "incidencias nuevas" / "estado de validación de pago".
20. Selector de tema, notificaciones in-app, exportaciones avanzadas, analítica.

---

## 10. Technical Debt

- **`schema.sql` duplicado a mano** respecto a la migración baseline — riesgo de drift.
- **Código muerto**: `AuthLayout.tsx`, `useResidentials.ts`, `useUnits.ts`, las funciones de gating en `routes.ts`, `database.types.ts.bak`.
- **`console.log` de depuración** en `useAccess.ts` sin gate consistente de `DEV`.
- **Sin tests**: no hay ningún framework de testing en `package.json` (ni unit, ni integración, ni E2E), y no hay CI configurado. Para un proyecto con historial de bugs de RLS, esto es la deuda más importante a resolver antes de escalar a 5 módulos nuevos.
- **i18n incompleto** en los módulos más recientes (units/addons/charges/dashboard) — mezcla inglés/español.
- **Duplicación de `lg:pl-64`** en 7+ páginas por falta de un `<AppLayout>` compartido.
- **`createCrudService` sin paginación server-side** — quedará corto en cuanto una tabla crezca (especialmente `access_logs`/`audit_logs` a futuro).
- **`amenity_bookings` sin índices ni constraint anti-solapamiento**, pese a ya estar en el schema — construir la UI de reservas sin agregar esto primero reintroduciría un bug de doble-reserva conocido en la industria.

---

## 11. Recommended Implementation Order

**Phase 1 — Cimientos para Visitors/Security (P0)**
- Tablas `visitors`, `access_logs`, `vehicles` + RLS conectando el rol `security` real.
- Página Visitors (Today/Upcoming/Currently Inside/History) siguiendo el patrón "Manager" existente.
- Storage bucket privado para comprobantes/adjuntos + políticas RLS.

**Phase 2 — Incidents + Announcements (P0/P1)**
- Tablas `incidents`, `incident_attachments`, `announcements`, `announcement_reads` + RLS.
- Inbox de incidencias con estados y timeline.
- CRUD de comunicados con publicación programada.

**Phase 3 — Completar Payments/Amenities (P1)**
- Columnas `proof_url/validated_by/validated_at` en `unit_rental_payments`.
- Estado de cuenta consolidado por propiedad.
- UI de reservas para `amenity_bookings` + constraint `EXCLUDE` anti-doble-reserva.
- Amenities como Manager completo (horarios, capacidad, precio, imágenes).

**Phase 4 — Residents transversal + gestión de usuarios (P1)**
- Vista global de Residents.
- Pantalla de invitar/editar rol/remover en `residential_users`.

**Phase 5 — Dashboard operacional + navegación + Reports (P1/P2)**
- Rediseñar dashboard con métricas "que requieren atención" en vez de conteos.
- Reestructurar sidebar en grupos GESTIÓN/OPERACIÓN/CONTROL/SYSTEM.
- Módulo de Reports con filtros y export CSV.

**Phase 6 — Deuda técnica transversal (puede correr en paralelo)**
- Extraer `<AppLayout>`, `DataTable` y `EmptyState` genéricos antes/durante Phase 1-2 para no duplicar el trabajo 5 veces.
- Introducir un framework de testing mínimo (Vitest + Testing Library) empezando por los helpers de RLS/servicios más críticos.
- Completar i18n en los módulos existentes antes de que la deuda crezca con 5 módulos más.

---

## 12. Files That Would Need Changes

| Archivo | Razón | Cambio esperado |
|---|---|---|
| `src/config/routes.ts` | Agregar rutas para Visitors/Amenities/Payments/Incidents/Announcements/Security/Reports; eliminar o conectar la metadata muerta (`requiresAuth`, etc.) | Nuevos `RouteType`, nuevos hash, o reemplazo por React Router si se decide escalar el router |
| `src/App.tsx` | El if-chain actual no escala a 10 módulos | Refactor a una tabla de rutas → componente, o adoptar React Router |
| `src/components/AppSidebar.tsx` | Navegación plana actual (Dashboard/Units/Settings) | Agregar grupos GESTIÓN/OPERACIÓN/CONTROL/SYSTEM con los nuevos items |
| `src/services/index.ts` | Nuevos servicios de dominio | Barrel exports para `visitorService`, `incidentService`, `announcementService`, etc. |
| `src/services/createCrudService.ts` | Reutilizar para las tablas nuevas que sean CRUD plano | Posiblemente agregar soporte de `.range()` para paginación server-side |
| `src/pages/` | Nuevas páginas por módulo | `VisitorsPage.tsx`, `IncidentsPage.tsx`, `AnnouncementsPage.tsx`, `ReportsPage.tsx`, `SecurityPage.tsx` |
| `src/components/units/*` | Modelo de referencia para replicar | Copiar el patrón Sheet+Table+ManagerData hook para cada módulo nuevo |
| `src/components/ResidentialDashboardPage.tsx` | Amenities hoy vive aquí como diálogo embebido | Extraer a un `AmenityManager` dedicado; agregar métricas operacionales reales |
| `src/pages/PlatformDashboardPage.tsx` | "Open" no navega a nada | Conectar a una vista real de la residencial seleccionada |
| `src/pages/SettingsPage.tsx` | Sin edición de perfil de residencial ni gestión de usuarios | Agregar secciones "Residential" y "Users" a `SECTIONS` |
| `src/services/api.service.ts` (`residentialUserService`) | Solo tiene `list`/`add` usados | Agregar `updateRole`/`remove`, exponerlos en una UI nueva |
| `src/state/useAccess.ts` | Console.logs de debug, sin selector multi-residencial | Limpiar logs incondicionales; opcionalmente soportar más de una membresía |
| `supabase/migrations/` | Todos los cambios de BD de la sección 13 | Nueva migración incremental (no editar la baseline) |
| `src/types/database.types.ts` | Nuevas tablas | Regenerar con `npm run types` tras cada migración |
| `docs/` | Documentación desactualizada mezclada con vigente | Considerar mover `docs/README.md`'s índice a distinguir explícitamente "histórico" vs. "vigente" (ya hace un intento, reforzarlo) |

---

## 13. Database Changes Required

*(Solo referencia — no ejecutar. Migraciones incrementales, nunca editar la baseline existente.)*

**Tablas nuevas:**
- `visitors` (id, residential_id, unit_id, invited_by, name, phone, plate, valid_from, valid_until, access_code, status, created_at)
- `vehicles` (id, residential_id, unit_id, resident_id nullable, plate, brand, model, color, created_at)
- `access_logs` (id, visitor_id, residential_id, gate_id nullable, checked_in_by, checked_in_at, checked_out_by, checked_out_at)
- `gates` (id, residential_id, name, is_active) — opcional, solo si se requiere registrar el punto de acceso
- `incidents` (id, residential_id, unit_id, resident_id nullable, category, title, description, location, priority, status, assigned_to, created_at, resolved_at)
- `incident_attachments` (id, incident_id, storage_path, uploaded_by, created_at)
- `announcements` (id, residential_id, title, content, category, audience, publish_at, status, created_by, created_at)
- `announcement_reads` (announcement_id, user_id, read_at, PK compuesta)
- `amenity_schedules` (id, amenity_id, day_of_week, start_time, end_time) — opcional para MVP

**Columnas nuevas en tablas existentes:**
- `residentials`: `logo_url text`, `timezone text default 'UTC'`
- `unit_rental_payments`: `proof_url text`, `validated_by uuid references profiles(user_id)`, `validated_at timestamptz`
- `amenities`: `images text[]`, `booking_duration_minutes int`, `advance_booking_days int`, `cancellation_policy text`, `price numeric(12,2)`
- `unit_residents` y/o `unit_members`: `relationship_type text check (relationship_type in ('owner','tenant','family_member','other'))`

**Índices nuevos:**
- `residential_users(user_id)` (mejora inmediata para `useAccess`)
- `amenity_bookings(amenity_id, start_time)`
- Todos los `residential_id`/`status`/`created_at` de las tablas nuevas listadas en la sección 8.

**Constraints:**
- `amenity_bookings`: `EXCLUDE USING gist (amenity_id WITH =, tsrange(start_time,end_time) WITH &&) WHERE (status <> 'cancelled')` (requiere `create extension if not exists btree_gist`) — evita doble-reserva a nivel de BD, no solo en frontend.
- Considerar el mismo patrón para `unit_rentals` si se quiere evitar rentas `monthly` solapadas sobre la misma unidad.

**RLS policies nuevas:**
- Para cada tabla nueva: `platform admin all`, `owner/admin manage`, `member view` — replicando exactamente el patrón ya usado en `units`/`charges`/etc.
- Para `visitors`/`access_logs`: agregar explícitamente una política que use `is_residential_security()` (hoy sin uso) para que el rol `security` pueda ver/gestionar check-in/check-out sin necesitar rol `admin`.
- Para `incident_attachments`/comprobantes de pago: política de `storage.objects` que valide pertenencia vía `is_residential_admin()` o el dueño del registro — nunca bucket público.

**Funciones:**
- Ninguna función `SECURITY DEFINER` adicional debería ser necesaria — el patrón de 5 helpers ya cubre los casos de acceso; reutilizarlos en las políticas nuevas en vez de escribir lógica ad hoc.
- Opcional: una vista o función que calcule `balance = charges - approved payments` por unidad, para no depender de un campo editable a mano.

---

## 14. Final MVP Scorecard

| Área | Estado |
|---|---|
| Authentication | ✅ Complete |
| Multi-tenancy | ✅ Complete |
| Properties | ✅ Complete |
| Residents | 🟡 Partial |
| Visitors | 🔴 Missing |
| Amenities | 🟡 Partial |
| Payments | 🟡 Partial |
| Incidents | 🔴 Missing |
| Announcements | 🔴 Missing |
| Security | 🔴 Missing |
| Reports | 🔴 Missing |
| Settings | 🟡 Partial |
| RLS | ✅ Complete |
| Storage Security | 🔴 Missing (no hay storage en absoluto) |
| UX consistency | 🟡 Partial |
| Performance | 🟡 Partial |

### Top 10 Next Actions (por impacto)

1. **Diseñar y crear el esquema de Visitors + Access Logs + Vehicles**, con RLS que active por fin el rol `security` — es el hueco más grande y el más alineado al nombre del producto.
2. **Crear un bucket de Storage privado** con políticas RLS, prerequisito de comprobantes de pago, fotos de incidencias y logos.
3. **Agregar `proof_url`/`validated_by`/`validated_at`** a `unit_rental_payments` y construir el flujo de validación de comprobantes.
4. **Construir el módulo de Incidents** (tabla + inbox con estados) — reutilizando el patrón Sheet+Table ya probado.
5. **Conectar `amenity_bookings`** a una UI real + agregar el constraint `EXCLUDE` anti-doble-reserva antes de exponerlo a residentes.
6. **Agregar pantalla de gestión de usuarios/roles** en Settings — el backend ya lo soporta por completo, es pura UI.
7. **Reestructurar el sidebar** en los 4 grupos (GESTIÓN/OPERACIÓN/CONTROL/SYSTEM) a medida que se agreguen módulos, para no acumular una navegación plana de 10 items sueltos.
8. **Rediseñar el Dashboard** hacia métricas operacionales ("necesita atención") en vez de conteos estáticos, una vez existan Visitors/Incidents/Payments-pendientes que mostrar.
9. **Construir el módulo de Announcements**, el más simple de los faltantes y con buen retorno de UX.
10. **Introducir un framework de testing mínimo** (Vitest + Testing Library, empezando por servicios y RLS-adjacent logic) antes de escalar a 5 módulos nuevos — el historial de bugs de RLS documentado en `docs/` no debería repetirse sin red de seguridad.
