-- Expertalia 360 · instalación completa en un proyecto nuevo de Supabase
-- Pega este archivo completo en Supabase → SQL Editor → New query → Run (una sola vez).
-- Generado por supabase/build-setup.sh a partir de supabase/migrations, seed.sql y seed_demo.sql.

-- ════════ supabase/migrations/20261023000000_esquema_inicial.sql ════════
-- Expertalia 360 · esquema inicial
-- Negocios por categoría, catálogo, reservas, pedidos, cobros, reseñas, lealtad y promociones.
-- Todas las tablas tienen RLS. Los permisos se otorgan explícitamente al final
-- (el proyecto tiene desactivado "Automatically expose new tables").

create extension if not exists postgis with schema extensions;

-- ─────────────────────────────────────────────────────────────
-- Tipos
-- ─────────────────────────────────────────────────────────────
create type public.user_role as enum ('vecino', 'negocio', 'repartidor', 'admin');
create type public.business_status as enum ('pendiente', 'activo', 'suspendido');
create type public.catalog_kind as enum ('producto', 'cita', 'cotizacion');
create type public.booking_status as enum ('pendiente', 'confirmada', 'atendida', 'no_asistio', 'cancelada');
create type public.order_mode as enum ('para_llevar', 'domicilio', 'en_local');
create type public.order_status as enum ('recibido', 'aceptado', 'preparando', 'en_camino', 'entregado', 'cancelado');
create type public.payment_method as enum ('efectivo', 'tarjeta', 'transferencia', 'liga');
create type public.loyalty_kind as enum ('sellos', 'puntos');
create type public.promo_target as enum ('clientes', 'inactivos', 'cerca', 'zona', 'global');

-- ─────────────────────────────────────────────────────────────
-- Catálogos generales
-- ─────────────────────────────────────────────────────────────
create table public.zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  municipality text not null,
  state text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories (id) on delete cascade,
  name text not null,
  slug text not null unique,
  color text,
  icon text,
  position int not null default 0
);

-- ─────────────────────────────────────────────────────────────
-- Usuarios
-- ─────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text unique,
  role public.user_role not null default 'vecino',
  zone_id uuid references public.zones (id),
  birthday date,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Crea el perfil al registrarse
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.phone);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- Negocios
-- ─────────────────────────────────────────────────────────────
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  category_id uuid references public.categories (id),
  zone_id uuid references public.zones (id),
  phone text,
  whatsapp text,
  address text,
  location extensions.geography (point, 4326),
  logo_url text,
  cover_url text,
  is_open boolean not null default true,
  accepts_orders boolean not null default true,
  delivers boolean not null default false,
  plan text not null default 'estandar',
  status public.business_status not null default 'pendiente',
  rating_avg numeric(2, 1) not null default 0,
  rating_count int not null default 0,
  created_at timestamptz not null default now()
);
create index businesses_location_idx on public.businesses using gist (location);
create index businesses_category_idx on public.businesses (category_id);

create or replace function public.owns_business(bid uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.businesses where id = bid and owner_id = auth.uid());
$$;

create table public.business_modules (
  business_id uuid not null references public.businesses (id) on delete cascade,
  module text not null check (module in ('catalogo', 'ordenar', 'pagar', 'reservar', 'cotizar', 'consulta')),
  primary key (business_id, module)
);

create table public.business_hours (
  business_id uuid not null references public.businesses (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  opens time not null,
  closes time not null,
  primary key (business_id, weekday, opens)
);

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  active boolean not null default true
);

create table public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  kind public.catalog_kind not null default 'producto',
  name text not null,
  description text,
  section text,
  price numeric(10, 2),
  duration_min int,
  photo_url text,
  is_available boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index catalog_items_business_idx on public.catalog_items (business_id);

create table public.favorites (
  customer_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, business_id)
);

-- ─────────────────────────────────────────────────────────────
-- Reservas, pedidos y cobros
-- ─────────────────────────────────────────────────────────────
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  item_id uuid references public.catalog_items (id) on delete set null,
  staff_id uuid references public.staff (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.booking_status not null default 'pendiente',
  price numeric(10, 2),
  notes text,
  created_at timestamptz not null default now()
);
create index bookings_business_time_idx on public.bookings (business_id, starts_at);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  mode public.order_mode not null default 'para_llevar',
  status public.order_status not null default 'recibido',
  subtotal numeric(10, 2) not null default 0,
  delivery_fee numeric(10, 2) not null default 0,
  tip numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  payment_method public.payment_method not null default 'efectivo',
  paid boolean not null default false,
  delivery_location extensions.geography (point, 4326),
  delivery_notes text,
  created_at timestamptz not null default now()
);
create index orders_business_idx on public.orders (business_id, created_at desc);
create index orders_customer_idx on public.orders (customer_id, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  item_id uuid references public.catalog_items (id) on delete set null,
  name text not null,
  unit_price numeric(10, 2) not null,
  qty int not null check (qty > 0)
);

-- Cobros en el mostrador (efectivo, tarjeta propia, transferencia) y pagos de pedidos
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid references public.profiles (id) on delete set null,
  customer_phone text,
  order_id uuid references public.orders (id) on delete set null,
  amount numeric(10, 2) not null check (amount > 0),
  payment_method public.payment_method not null,
  note text,
  created_at timestamptz not null default now()
);
create index sales_business_idx on public.sales (business_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- Reseñas
-- ─────────────────────────────────────────────────────────────
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text,
  -- visita verificada: ligada a una venta, pedido o cita atendida
  sale_id uuid references public.sales (id) on delete set null,
  order_id uuid references public.orders (id) on delete set null,
  booking_id uuid references public.bookings (id) on delete set null,
  verified boolean not null default false,
  reply text,
  replied_at timestamptz,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index reviews_business_idx on public.reviews (business_id, created_at desc);

-- Marca la reseña como verificada si la venta, pedido o cita es del autor y del negocio
create or replace function public.reviews_set_verified()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.verified := exists (select 1 from public.sales s where s.id = new.sale_id and s.customer_id = new.author_id and s.business_id = new.business_id)
    or exists (select 1 from public.orders o where o.id = new.order_id and o.customer_id = new.author_id and o.business_id = new.business_id and o.status = 'entregado')
    or exists (select 1 from public.bookings b where b.id = new.booking_id and b.customer_id = new.author_id and b.business_id = new.business_id and b.status = 'atendida');
  return new;
end;
$$;

create trigger reviews_verified
  before insert or update of sale_id, order_id, booking_id on public.reviews
  for each row execute function public.reviews_set_verified();

-- Mantiene el promedio de calificación del negocio
create or replace function public.refresh_business_rating()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  bid uuid := coalesce(new.business_id, old.business_id);
begin
  update public.businesses b
  set rating_avg = coalesce((select round(avg(rating)::numeric, 1) from public.reviews r where r.business_id = bid and not r.hidden), 0),
      rating_count = (select count(*) from public.reviews r where r.business_id = bid and not r.hidden)
  where b.id = bid;
  return null;
end;
$$;

create trigger reviews_rating
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_business_rating();

-- ─────────────────────────────────────────────────────────────
-- Lealtad y promociones
-- ─────────────────────────────────────────────────────────────
create table public.loyalty_programs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  kind public.loyalty_kind not null default 'sellos',
  goal int check (goal > 0),              -- sellos necesarios
  percent numeric(5, 2),                  -- % de regreso en puntos
  reward text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.loyalty_cards (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.loyalty_programs (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  stamps int not null default 0,
  points numeric(10, 2) not null default 0,
  updated_at timestamptz not null default now(),
  unique (program_id, customer_id)
);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses (id) on delete cascade, -- null = promoción global
  title text not null,
  description text,
  badge text,                              -- "2x1", "-20%", "GRATIS"
  target public.promo_target not null default 'clientes',
  zone_id uuid references public.zones (id),
  radius_m int,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  max_redemptions int,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.promotion_redemptions (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions (id) on delete cascade,
  customer_id uuid references public.profiles (id) on delete set null,
  sale_id uuid references public.sales (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Búsqueda por cercanía (mapa)
-- ─────────────────────────────────────────────────────────────
create or replace function public.nearby_businesses(lat double precision, lng double precision, radius_m int default 5000)
returns table (
  id uuid, name text, slug text, category_id uuid, rating_avg numeric, rating_count int,
  is_open boolean, lat double precision, lng double precision, distance_m double precision
)
language sql stable set search_path = ''
as $$
  select b.id, b.name, b.slug, b.category_id, b.rating_avg, b.rating_count, b.is_open,
         extensions.st_y(b.location::extensions.geometry), extensions.st_x(b.location::extensions.geometry),
         extensions.st_distance(b.location, extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography)
  from public.businesses b
  where b.status = 'activo'
    and b.location is not null
    and extensions.st_dwithin(b.location, extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography, radius_m)
  order by 10
  limit 200;
$$;

-- El negocio identifica al cliente por celular para sumar lealtad.
-- Devuelve solo id y nombre de pila, y solo a quien tiene un negocio.
create or replace function public.find_customer_by_phone(p_phone text)
returns table (id uuid, first_name text)
language sql stable security definer set search_path = ''
as $$
  select p.id, split_part(coalesce(p.full_name, ''), ' ', 1)
  from public.profiles p
  where p.phone = p_phone
    and exists (select 1 from public.businesses b where b.owner_id = auth.uid())
  limit 1;
$$;

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────
alter table public.zones enable row level security;
alter table public.categories enable row level security;
alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_modules enable row level security;
alter table public.business_hours enable row level security;
alter table public.staff enable row level security;
alter table public.catalog_items enable row level security;
alter table public.favorites enable row level security;
alter table public.bookings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.sales enable row level security;
alter table public.reviews enable row level security;
alter table public.loyalty_programs enable row level security;
alter table public.loyalty_cards enable row level security;
alter table public.promotions enable row level security;
alter table public.promotion_redemptions enable row level security;

-- Catálogos públicos
create policy "zonas públicas" on public.zones for select using (true);
create policy "zonas admin" on public.zones for all using (public.is_admin()) with check (public.is_admin());
create policy "categorías públicas" on public.categories for select using (true);
create policy "categorías admin" on public.categories for all using (public.is_admin()) with check (public.is_admin());

-- Perfiles: cada quien el suyo
create policy "ver mi perfil" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "editar mi perfil" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and role <> 'admin');

-- Negocios: activos son públicos; el dueño ve y edita el suyo
create policy "negocios activos públicos" on public.businesses for select
  using (status = 'activo' or owner_id = auth.uid() or public.is_admin());
create policy "dar de alta mi negocio" on public.businesses for insert
  with check (owner_id = auth.uid() and status = 'pendiente');
create policy "editar mi negocio" on public.businesses for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

-- Tablas del negocio: lectura pública, escritura del dueño
create policy "módulos públicos" on public.business_modules for select using (true);
create policy "módulos del dueño" on public.business_modules for all using (public.owns_business(business_id)) with check (public.owns_business(business_id));
create policy "horarios públicos" on public.business_hours for select using (true);
create policy "horarios del dueño" on public.business_hours for all using (public.owns_business(business_id)) with check (public.owns_business(business_id));
create policy "personal público" on public.staff for select using (true);
create policy "personal del dueño" on public.staff for all using (public.owns_business(business_id)) with check (public.owns_business(business_id));
create policy "catálogo público" on public.catalog_items for select using (true);
create policy "catálogo del dueño" on public.catalog_items for all using (public.owns_business(business_id)) with check (public.owns_business(business_id));
create policy "programas de lealtad públicos" on public.loyalty_programs for select using (true);
create policy "programas del dueño" on public.loyalty_programs for all using (public.owns_business(business_id)) with check (public.owns_business(business_id));

-- Favoritos
create policy "mis favoritos" on public.favorites for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());

-- Reservas
create policy "ver reservas propias o de mi negocio" on public.bookings for select
  using (customer_id = auth.uid() or public.owns_business(business_id));
create policy "reservar" on public.bookings for insert
  with check (customer_id = auth.uid() and status = 'pendiente');
create policy "actualizar reserva" on public.bookings for update
  using (customer_id = auth.uid() or public.owns_business(business_id));

-- Pedidos
create policy "ver pedidos propios o de mi negocio" on public.orders for select
  using (customer_id = auth.uid() or public.owns_business(business_id));
create policy "hacer pedido" on public.orders for insert
  with check (customer_id = auth.uid() and status = 'recibido');
create policy "actualizar pedido" on public.orders for update
  using (customer_id = auth.uid() or public.owns_business(business_id));

create policy "ver partidas" on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = auth.uid() or public.owns_business(o.business_id))));
create policy "agregar partidas" on public.order_items for insert
  with check (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid() and o.status = 'recibido'));

-- Cobros: solo el negocio (y el cliente ve los suyos)
create policy "ver cobros" on public.sales for select
  using (public.owns_business(business_id) or customer_id = auth.uid());
create policy "registrar cobro" on public.sales for insert
  with check (public.owns_business(business_id));

-- Reseñas
create policy "reseñas públicas" on public.reviews for select
  using (not hidden or author_id = auth.uid() or public.owns_business(business_id) or public.is_admin());
create policy "escribir reseña" on public.reviews for insert
  with check (author_id = auth.uid() and reply is null);
create policy "editar mi reseña o responder" on public.reviews for update
  using (author_id = auth.uid() or public.owns_business(business_id) or public.is_admin());

-- Tarjetas de lealtad
create policy "ver tarjetas" on public.loyalty_cards for select
  using (customer_id = auth.uid()
         or exists (select 1 from public.loyalty_programs p where p.id = program_id and public.owns_business(p.business_id)));
create policy "sumar en tarjetas" on public.loyalty_cards for all
  using (exists (select 1 from public.loyalty_programs p where p.id = program_id and public.owns_business(p.business_id)))
  with check (exists (select 1 from public.loyalty_programs p where p.id = program_id and public.owns_business(p.business_id)));

-- Promociones
create policy "promociones activas públicas" on public.promotions for select
  using (active or public.owns_business(business_id) or public.is_admin());
create policy "promociones del dueño" on public.promotions for all
  using (public.owns_business(business_id)) with check (business_id is not null and public.owns_business(business_id));
create policy "promociones globales admin" on public.promotions for all
  using (public.is_admin()) with check (public.is_admin());

create policy "ver canjes" on public.promotion_redemptions for select
  using (customer_id = auth.uid()
         or exists (select 1 from public.promotions p where p.id = promotion_id and public.owns_business(p.business_id)));
create policy "registrar canje" on public.promotion_redemptions for insert
  with check (exists (select 1 from public.promotions p where p.id = promotion_id and public.owns_business(p.business_id)));

-- ─────────────────────────────────────────────────────────────
-- Permisos (solo lo que la app necesita)
-- ─────────────────────────────────────────────────────────────
grant usage on schema public to anon, authenticated;

grant select on public.zones, public.categories, public.businesses, public.business_modules,
  public.business_hours, public.staff, public.catalog_items, public.reviews,
  public.loyalty_programs, public.promotions
  to anon, authenticated;

grant select, update on public.profiles to authenticated;
grant insert, update on public.businesses to authenticated;
grant insert, update, delete on public.business_modules, public.business_hours, public.staff,
  public.catalog_items, public.loyalty_programs, public.promotions to authenticated;
grant select, insert, delete on public.favorites to authenticated;
grant select, insert, update on public.bookings, public.orders to authenticated;
grant select, insert on public.order_items, public.sales, public.promotion_redemptions to authenticated;
grant insert, update on public.reviews to authenticated;
grant select, insert, update on public.loyalty_cards to authenticated;
grant insert, update, delete on public.zones, public.categories to authenticated; -- limitado por RLS a admin

grant execute on function public.nearby_businesses(double precision, double precision, int) to anon, authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.owns_business(uuid) to authenticated;
grant execute on function public.find_customer_by_phone(text) to authenticated;

-- ════════ supabase/migrations/20261023010000_directorio_y_resenas.sql ════════
-- Expertalia 360 · ajustes para mostrar el directorio en la app
-- 1. Negocios dados de alta por el operador antes de que el dueño los reclame (owner_id opcional).
-- 2. Datos que muestra el perfil: subtítulo, promoción vigente, verificado, lat/lng legibles.
-- 3. Nombre visible del autor en reseñas (los perfiles son privados por RLS).

alter table public.businesses alter column owner_id drop not null;

alter table public.businesses
  add column if not exists subtitle text,
  add column if not exists promo text,
  add column if not exists verified boolean not null default false,
  add column if not exists lat double precision generated always as (extensions.st_y(location::extensions.geometry)) stored,
  add column if not exists lng double precision generated always as (extensions.st_x(location::extensions.geometry)) stored;

-- Reseñas: nombre visible ("Ana G.") guardado al publicar; autor opcional para reseñas importadas
alter table public.reviews alter column author_id drop not null;
alter table public.reviews add column if not exists author_name text;

create or replace function public.reviews_set_author_name()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  full_name text;
begin
  if new.author_id is not null and new.author_name is null then
    select p.full_name into full_name from public.profiles p where p.id = new.author_id;
    new.author_name := coalesce(
      nullif(trim(split_part(full_name, ' ', 1) || ' ' || left(split_part(full_name, ' ', 2), 1) || '.'), '.'),
      'Vecino'
    );
  end if;
  return new;
end;
$$;

create trigger reviews_author_name
  before insert on public.reviews
  for each row execute function public.reviews_set_author_name();

-- La política de inserción exige autor; las importadas solo las inserta el operador
drop policy if exists "escribir reseña" on public.reviews;
create policy "escribir reseña" on public.reviews for insert
  with check ((author_id = auth.uid() and reply is null) or public.is_admin());

-- Alta de negocios por el operador
drop policy if exists "dar de alta mi negocio" on public.businesses;
create policy "dar de alta mi negocio" on public.businesses for insert
  with check ((owner_id = auth.uid() and status = 'pendiente') or public.is_admin());

-- ════════ supabase/migrations/20261023020000_estadisticas.sql ════════
-- Expertalia 360 · estadísticas por negocio
-- La app registra eventos anónimos (abrir el negocio, ver el menú, elegir un
-- producto, leer reseñas, contactar, cuánto tiempo se queda) y cada negocio ve
-- su tablero con business_stats(). No se guarda nombre, teléfono ni ubicación de
-- quien mira: solo un identificador aleatorio del teléfono.

create table public.business_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  kind text not null check (kind in (
    'vista_perfil',   -- abrió la página del negocio
    'vista_catalogo', -- abrió el menú, los servicios, reservar o cotizar
    'seleccion',      -- eligió un producto o servicio (carrito, reserva, cotización)
    'vista_resenas',  -- abrió las reseñas
    'contacto',       -- WhatsApp o llamada
    'como_llegar',
    'compartir',
    'favorito',
    'pedido', 'reserva', 'cotizacion',
    'tiempo'          -- tiempo que pasó en una pantalla del negocio (duration_ms)
  )),
  visitor_id text not null check (char_length(visitor_id) between 8 and 64),
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  item_id uuid references public.catalog_items (id) on delete set null,
  duration_ms integer check (duration_ms between 0 and 1800000),
  screen text check (char_length(screen) <= 20),
  source text check (char_length(source) <= 20),
  created_at timestamptz not null default now()
);

create index business_events_business_time on public.business_events (business_id, created_at desc);

alter table public.business_events enable row level security;

-- Cualquiera que use la app puede registrar eventos de negocios activos
create policy "registrar eventos" on public.business_events
  for insert to anon, authenticated
  with check (
    (user_id is null or user_id = auth.uid())
    and created_at > now() - interval '5 minutes'
    and created_at < now() + interval '5 minutes'
    and exists (select 1 from public.businesses b where b.id = business_id and b.status = 'activo')
  );

-- Solo el dueño y el administrador leen los eventos crudos
create policy "dueño y admin leen eventos" on public.business_events
  for select to authenticated
  using (public.owns_business(business_id) or public.is_admin());

grant insert on public.business_events to anon, authenticated;
grant select on public.business_events to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Tablero: indicadores del periodo (1 = hoy, 7, 30 días) en hora del centro de México.
-- Lo pueden consultar el dueño, el administrador o el SQL Editor de Supabase.
-- Las visitas del propio dueño no cuentan.
-- ─────────────────────────────────────────────────────────────
create or replace function public.business_stats(p_slug text, p_days integer default 7)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_biz uuid;
  v_owner uuid;
  v_tz constant text := 'America/Mexico_City';
  v_today date := (now() at time zone v_tz)::date;
  v_from timestamptz;
  v_prev timestamptz;
  v_days integer := greatest(1, least(coalesce(p_days, 7), 90));
  v_result jsonb;
begin
  select id, owner_id into v_biz, v_owner from public.businesses where slug = p_slug;
  if v_biz is null then
    raise exception 'Negocio no encontrado';
  end if;
  -- Desde la app (hay sesión de la API) solo el dueño o el admin; desde el SQL Editor, sin restricción
  if not (
    public.owns_business(v_biz)
    or public.is_admin()
    or (coalesce(current_setting('request.jwt.claims', true), '') = '' and auth.uid() is null and session_user in ('postgres', 'supabase_admin'))
  ) then
    raise exception 'Solo el dueño del negocio puede ver sus estadísticas' using errcode = '42501';
  end if;

  v_from := ((v_today - (v_days - 1))::timestamp) at time zone v_tz;
  v_prev := ((v_today - (2 * v_days - 1))::timestamp) at time zone v_tz;

  with ev as (
    select e.*, (e.created_at at time zone v_tz) as local_at
    from public.business_events e
    where e.business_id = v_biz
      and e.created_at >= v_prev
      and (v_owner is null or e.user_id is distinct from v_owner)
  ),
  -- Los anuncios al abrir la app se cuentan aparte: verlos no es visitar el negocio
  cur as (select * from ev where created_at >= v_from and kind not like 'anuncio%'),
  visits as (
    select visitor_id, local_at::date as d, sum(coalesce(duration_ms, 0)) filter (where kind = 'tiempo') as ms
    from cur
    group by visitor_id, local_at::date
  ),
  series as (
    select case when v_days = 1 then extract(hour from local_at)::int::text else to_char(local_at::date, 'YYYY-MM-DD') end as label,
           count(distinct visitor_id) as visitors
    from cur
    group by 1
  ),
  hours as (
    select extract(hour from local_at)::int as h, count(*) as n
    from cur where kind = 'vista_perfil'
    group by 1
  ),
  items as (
    select item_id, count(*) as n
    from cur where kind = 'seleccion' and item_id is not null
    group by item_id order by n desc limit 5
  ),
  sources as (
    select coalesce(source, 'otro') as source, count(distinct visitor_id) as visitors
    from cur where kind = 'vista_perfil'
    group by 1 order by visitors desc
  )
  select jsonb_build_object(
    'days', v_days,
    'visitors', (select count(distinct visitor_id) from cur),
    -- periodo anterior, hasta el mismo momento (hoy a las 3 pm contra ayer a las 3 pm)
    'prevVisitors', (select count(distinct visitor_id) from ev where created_at < v_from and created_at <= now() - make_interval(days => v_days) and kind not like 'anuncio%'),
    'adViews', (select count(distinct visitor_id) from ev where created_at >= v_from and kind = 'anuncio_visto'),
    'adTaps', (select count(distinct visitor_id) from ev where created_at >= v_from and kind = 'anuncio_toque'),
    'views', (select count(*) from cur where kind = 'vista_perfil'),
    'avgSeconds', coalesce((select round(avg(ms) / 1000.0) from visits where ms > 0), 0),
    'engaged', (select count(*) from visits where ms >= 10000),
    'dwell', jsonb_build_object(
      'lt10', (select count(*) from visits where coalesce(ms, 0) < 10000),
      's10to30', (select count(*) from visits where ms >= 10000 and ms < 30000),
      's30to60', (select count(*) from visits where ms >= 30000 and ms < 60000),
      'gt60', (select count(*) from visits where ms >= 60000)
    ),
    'funnel', jsonb_build_object(
      'visitors', (select count(distinct visitor_id) from cur),
      'catalog', (select count(distinct visitor_id) from cur where kind in ('vista_catalogo', 'seleccion')),
      'selected', (select count(distinct visitor_id) from cur where kind = 'seleccion'),
      'converted', (select count(distinct visitor_id) from cur where kind in ('pedido', 'reserva', 'cotizacion'))
    ),
    'reviews', (select count(distinct visitor_id) from cur where kind = 'vista_resenas'),
    'contacts', (select count(*) from cur where kind = 'contacto'),
    'directions', (select count(*) from cur where kind = 'como_llegar'),
    'shares', (select count(*) from cur where kind = 'compartir'),
    'favorites', (select count(*) from cur where kind = 'favorito'),
    'orders', (select count(*) from cur where kind = 'pedido'),
    'bookings', (select count(*) from cur where kind = 'reserva'),
    'quotes', (select count(*) from cur where kind = 'cotizacion'),
    'series', coalesce((select jsonb_agg(jsonb_build_object('label', label, 'visitors', visitors) order by label) from series), '[]'::jsonb),
    'hours', (select jsonb_agg(coalesce(n, 0) order by g) from generate_series(0, 23) g left join hours on hours.h = g),
    'topItems', coalesce((select jsonb_agg(jsonb_build_object('itemId', item_id, 'selections', n) order by n desc) from items), '[]'::jsonb),
    'sources', coalesce((select jsonb_agg(jsonb_build_object('source', source, 'visitors', visitors) order by visitors desc) from sources), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function public.business_stats(text, integer) from public;
grant execute on function public.business_stats(text, integer) to authenticated;

-- ════════ supabase/migrations/20261023030000_anuncio_al_abrir.sql ════════
-- Expertalia 360 · anuncio al abrir la app
-- El negocio paga (ej. $100 al mes) para que su logo y su promoción aparezcan a
-- pantalla completa, como historia, cuando un vecino abre la app. Cada marca le
-- aparece a cada persona como máximo una vez cada 3 horas (lo controla la app).

create table public.opening_ads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  headline text not null check (char_length(headline) between 3 and 40),
  body text check (char_length(body) <= 90),
  cta text not null default 'Ver promoción' check (char_length(cta) <= 20),
  color text not null default '#E04A1F' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  item_id uuid references public.catalog_items (id) on delete set null,
  zone_id uuid references public.zones (id),  -- null = todas las zonas
  starts_on date not null default current_date,
  ends_on date not null default (current_date + 30),
  monthly_price numeric(10, 2) not null default 100,
  status text not null default 'en_revision' check (status in ('en_revision', 'activa', 'pausada', 'terminada')),
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create index opening_ads_active on public.opening_ads (status, starts_on, ends_on);

alter table public.opening_ads enable row level security;

-- Todos ven los anuncios vigentes; el dueño y el admin ven también los suyos en revisión
create policy "ver anuncios vigentes" on public.opening_ads
  for select to anon, authenticated
  using (
    (status = 'activa' and current_date between starts_on and ends_on)
    or public.owns_business(business_id)
    or public.is_admin()
  );

-- El dueño lo solicita (queda en revisión hasta que se paga y se aprueba)
create policy "dueño solicita anuncio" on public.opening_ads
  for insert to authenticated
  with check ((public.owns_business(business_id) and status = 'en_revision') or public.is_admin());

-- El dueño puede pausarlo; el admin lo aprueba o lo termina
create policy "dueño pausa, admin aprueba" on public.opening_ads
  for update to authenticated
  using (public.owns_business(business_id) or public.is_admin())
  with check (public.is_admin() or (public.owns_business(business_id) and status in ('en_revision', 'pausada')));

grant select on public.opening_ads to anon, authenticated;
grant insert, update on public.opening_ads to authenticated;

-- Las vistas y los toques del anuncio se registran en business_events
alter table public.business_events drop constraint business_events_kind_check;
alter table public.business_events add constraint business_events_kind_check check (kind in (
  'vista_perfil', 'vista_catalogo', 'seleccion', 'vista_resenas', 'contacto', 'como_llegar',
  'compartir', 'favorito', 'pedido', 'reserva', 'cotizacion', 'tiempo',
  'anuncio_visto', 'anuncio_toque'
));

-- ════════ supabase/migrations/20261023040000_fotos.sql ════════
-- Expertalia 360 · fotos de productos, promociones y anuncios
-- Las fotos viven en Supabase Storage (bucket público "fotos"), en carpetas por negocio:
--   fotos/<slug-del-negocio>/productos|promociones|anuncios/<archivo>
-- Todos las ven; solo el dueño del negocio (o el administrador) puede subir, cambiar o borrar.

alter table public.catalog_items add column if not exists image_url text;
alter table public.promotions add column if not exists image_url text;
alter table public.opening_ads add column if not exists image_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- ¿La carpeta (primer nivel de la ruta) es de un negocio de este usuario?
create or replace function public.owns_photo_folder(object_name text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1 from public.businesses b
    where b.slug = (storage.foldername(object_name))[1] and b.owner_id = auth.uid()
  );
$$;

drop policy if exists "fotos: cualquiera las ve" on storage.objects;
create policy "fotos: cualquiera las ve" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'fotos');

drop policy if exists "fotos: el dueño sube" on storage.objects;
create policy "fotos: el dueño sube" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos' and public.owns_photo_folder(name));

drop policy if exists "fotos: el dueño cambia" on storage.objects;
create policy "fotos: el dueño cambia" on storage.objects
  for update to authenticated
  using (bucket_id = 'fotos' and public.owns_photo_folder(name))
  with check (bucket_id = 'fotos' and public.owns_photo_folder(name));

drop policy if exists "fotos: el dueño borra" on storage.objects;
create policy "fotos: el dueño borra" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos' and public.owns_photo_folder(name));

-- ════════ supabase/migrations/20261024000000_expertalia.sql ════════
-- Expertalia 360 · directorio de profesionistas y oficios
-- 1. Dos mundos que no se mezclan: categorías de "profesionales" (con carrera y cédula) y "oficios".
-- 2. Perfil profesional: especialidades, cédula, experiencia, cómo atiende, galería y referencias.
-- 3. Comunidad: muro de servicios/consejos/eventos, preguntas a expertos y respuestas útiles.
-- 4. Solicitudes de cita, cotización y contratación que le llegan al profesional.
-- 5. El dueño no puede marcarse como verificado ni activarse solo: eso lo hace el administrador.

-- ─────────────────────────────────────────────────────────────
-- Categorías y especialidades
-- ─────────────────────────────────────────────────────────────
alter table public.categories
  add column if not exists world text not null default 'profesionales' check (world in ('profesionales', 'oficios')),
  add column if not exists professional text,
  add column if not exists emoji text,
  add column if not exists ink text;

create table if not exists public.specialties (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  name text not null,
  emoji text,
  keywords text[] not null default '{}',
  position int not null default 0,
  unique (category_id, name)
);

-- ─────────────────────────────────────────────────────────────
-- Perfil profesional
-- ─────────────────────────────────────────────────────────────
alter table public.businesses
  add column if not exists profession text,
  add column if not exists specialties text[] not null default '{}',
  add column if not exists extra_categories text[] not null default '{}', -- otras categorías (slugs) donde también aparece
  add column if not exists years_exp int not null default 0 check (years_exp >= 0),
  add column if not exists license text,              -- cédula profesional o certificación
  add column if not exists education text,
  add column if not exists languages text[] not null default '{Español}',
  add column if not exists attends text[] not null default '{despacho}', -- despacho | en_linea | domicilio
  add column if not exists consult_price numeric(10, 2),                -- 0 = primera consulta sin costo
  add column if not exists response_time text,
  add column if not exists directions text,           -- referencias para llegar
  add column if not exists urgent24 boolean not null default false,
  add column if not exists warranty text,
  add column if not exists payment_info text,         -- banco, CLABE y titular para transferencias
  add column if not exists available boolean not null default true,
  add column if not exists accepts_new boolean not null default true;

create index if not exists businesses_specialties_idx on public.businesses using gin (specialties);
create index if not exists businesses_extra_categories_idx on public.businesses using gin (extra_categories);

-- Galería de trabajos o del despacho
create table if not exists public.business_photos (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  url text,
  caption text not null default '',
  color text,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists business_photos_business_idx on public.business_photos (business_id, position);

-- La calificación promedio la recalcula el sistema al llegar una reseña; marca la operación
-- para que la protección de campos (abajo) la deje pasar.
create or replace function public.refresh_business_rating()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  bid uuid := coalesce(new.business_id, old.business_id);
begin
  perform set_config('expertalia.rating', 'on', true);
  update public.businesses b
  set rating_avg = coalesce((select round(avg(rating)::numeric, 1) from public.reviews r where r.business_id = bid and not r.hidden), 0),
      rating_count = (select count(*) from public.reviews r where r.business_id = bid and not r.hidden)
  where b.id = bid;
  perform set_config('expertalia.rating', 'off', true);
  return null;
end;
$$;

-- El dueño no cambia verificado, estado, plan, calificación ni dueño: solo el administrador.
-- Las instrucciones corridas desde el SQL Editor de Supabase (sin pasar por la app) no se limitan.
create or replace function public.businesses_protect_fields()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if session_user <> 'authenticator' or public.is_admin() or coalesce(current_setting('expertalia.rating', true), 'off') = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.verified := false;
    new.plan := 'estandar';
    new.rating_avg := 0;
    new.rating_count := 0;
    return new;
  end if;
  new.verified := old.verified;
  new.status := old.status;
  new.plan := old.plan;
  new.rating_avg := old.rating_avg;
  new.rating_count := old.rating_count;
  new.owner_id := old.owner_id;
  return new;
end;
$$;

drop trigger if exists businesses_protect on public.businesses;
create trigger businesses_protect
  before insert or update on public.businesses
  for each row execute function public.businesses_protect_fields();

-- Alta de perfil: el profesional aparece de inmediato (sin palomita de verificado hasta que se revise su cédula)
drop policy if exists "dar de alta mi negocio" on public.businesses;
create policy "dar de alta mi negocio" on public.businesses for insert
  with check ((owner_id = auth.uid() and status in ('pendiente', 'activo')) or public.is_admin());

-- Reclamar un perfil dado de alta por el operador (sin dueño todavía) queda pendiente de aprobación
create table if not exists public.business_claims (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  license text,
  note text,
  status text not null default 'pendiente' check (status in ('pendiente', 'aprobada', 'rechazada')),
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

-- Al aprobar el reclamo, el negocio pasa a ser del usuario
create or replace function public.business_claims_apply()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'aprobada' and old.status <> 'aprobada' then
    update public.businesses set owner_id = new.user_id where id = new.business_id;
    update public.profiles set role = 'negocio' where id = new.user_id and role = 'vecino';
  end if;
  return new;
end;
$$;

drop trigger if exists business_claims_after on public.business_claims;
create trigger business_claims_after
  after update of status on public.business_claims
  for each row execute function public.business_claims_apply();

-- ¿Cuál es mi perfil profesional? (el primero que tenga)
create or replace function public.my_business_slug()
returns text
language sql stable security definer set search_path = ''
as $$
  select slug from public.businesses where owner_id = auth.uid() order by created_at limit 1;
$$;

-- ─────────────────────────────────────────────────────────────
-- Comunidad: muro
-- ─────────────────────────────────────────────────────────────
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  kind text not null default 'consejo' check (kind in ('servicio', 'consejo', 'evento')),
  title text not null,
  body text not null default '',
  specialty text,
  price numeric(10, 2),
  price_note text,
  image_url text,
  likes_count int not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists posts_created_idx on public.posts (created_at desc);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  author_name text,
  body text not null check (length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);

create or replace function public.post_likes_count()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  pid uuid := coalesce(new.post_id, old.post_id);
begin
  update public.posts set likes_count = (select count(*) from public.post_likes where post_id = pid) where id = pid;
  return null;
end;
$$;

drop trigger if exists post_likes_after on public.post_likes;
create trigger post_likes_after
  after insert or delete on public.post_likes
  for each row execute function public.post_likes_count();

-- Nombre visible ("Ana G.") a partir del perfil, para comentarios, preguntas y solicitudes
create or replace function public.short_name(uid uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    nullif(trim(split_part(p.full_name, ' ', 1) || ' ' || left(split_part(p.full_name, ' ', 2), 1) || '.'), '.'),
    'Vecino'
  ) from public.profiles p where p.id = uid;
$$;

create or replace function public.set_author_name()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.author_id is not null and new.author_name is null then
    new.author_name := coalesce(public.short_name(new.author_id), 'Vecino');
  end if;
  return new;
end;
$$;

drop trigger if exists post_comments_author on public.post_comments;
create trigger post_comments_author
  before insert on public.post_comments
  for each row execute function public.set_author_name();

-- ─────────────────────────────────────────────────────────────
-- Comunidad: preguntas a expertos
-- ─────────────────────────────────────────────────────────────
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  author_name text,
  specialty text,
  body text not null check (length(body) between 10 and 1000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists questions_created_idx on public.questions (created_at desc);

drop trigger if exists questions_author on public.questions;
create trigger questions_author
  before insert on public.questions
  for each row execute function public.set_author_name();

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  body text not null check (length(body) between 10 and 2000),
  helpful_count int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists answers_question_idx on public.answers (question_id, created_at);

create table if not exists public.answer_helpful (
  answer_id uuid not null references public.answers (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (answer_id, user_id)
);

create or replace function public.answer_helpful_count()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  aid uuid := coalesce(new.answer_id, old.answer_id);
begin
  update public.answers set helpful_count = (select count(*) from public.answer_helpful where answer_id = aid) where id = aid;
  return null;
end;
$$;

drop trigger if exists answer_helpful_after on public.answer_helpful;
create trigger answer_helpful_after
  after insert or delete on public.answer_helpful
  for each row execute function public.answer_helpful_count();

-- ─────────────────────────────────────────────────────────────
-- Solicitudes al profesional: cita, cotización, contratación de paquete
-- ─────────────────────────────────────────────────────────────
create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid references public.profiles (id) on delete set null,
  customer_name text,
  customer_phone text,
  type text not null check (type in ('cita', 'cotizacion', 'contratacion')),
  item_id uuid references public.catalog_items (id) on delete set null,
  specialty text,
  detail text not null default '',
  when_text text,                      -- "Mañana 10:00", "Recibida ahora"
  starts_at timestamptz,
  attend text not null default 'despacho' check (attend in ('despacho', 'en_linea', 'domicilio')),
  status text not null default 'nueva' check (status in ('nueva', 'aceptada', 'cotizada', 'rechazada', 'atendida', 'cancelada')),
  quoted_price numeric(10, 2),
  amount numeric(10, 2),
  payment_method public.payment_method,
  created_at timestamptz not null default now()
);
create index if not exists requests_business_idx on public.requests (business_id, created_at desc);
create index if not exists requests_customer_idx on public.requests (customer_id, created_at desc);

create or replace function public.requests_customer_name()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.customer_id is not null and new.customer_name is null then
    new.customer_name := coalesce(public.short_name(new.customer_id), 'Cliente');
  end if;
  return new;
end;
$$;

drop trigger if exists requests_name on public.requests;
create trigger requests_name
  before insert on public.requests
  for each row execute function public.requests_customer_name();

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────
alter table public.specialties enable row level security;
alter table public.business_photos enable row level security;
alter table public.business_claims enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.answer_helpful enable row level security;
alter table public.requests enable row level security;

drop policy if exists "especialidades públicas" on public.specialties;
create policy "especialidades públicas" on public.specialties for select using (true);
drop policy if exists "especialidades admin" on public.specialties;
create policy "especialidades admin" on public.specialties for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "galería pública" on public.business_photos;
create policy "galería pública" on public.business_photos for select using (true);
drop policy if exists "galería del dueño" on public.business_photos;
create policy "galería del dueño" on public.business_photos for all
  using (public.owns_business(business_id) or public.is_admin()) with check (public.owns_business(business_id) or public.is_admin());

drop policy if exists "ver mis reclamos" on public.business_claims;
create policy "ver mis reclamos" on public.business_claims for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "reclamar perfil" on public.business_claims;
create policy "reclamar perfil" on public.business_claims for insert
  with check (user_id = auth.uid() and status = 'pendiente'
              and exists (select 1 from public.businesses b where b.id = business_id and b.owner_id is null));
drop policy if exists "resolver reclamo" on public.business_claims;
create policy "resolver reclamo" on public.business_claims for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "muro público" on public.posts;
create policy "muro público" on public.posts for select using (not hidden or public.owns_business(business_id) or public.is_admin());
drop policy if exists "publicar en el muro" on public.posts;
create policy "publicar en el muro" on public.posts for insert with check (public.owns_business(business_id));
drop policy if exists "editar mi publicación" on public.posts;
create policy "editar mi publicación" on public.posts for update
  using (public.owns_business(business_id) or public.is_admin()) with check (public.owns_business(business_id) or public.is_admin());
drop policy if exists "borrar mi publicación" on public.posts;
create policy "borrar mi publicación" on public.posts for delete using (public.owns_business(business_id) or public.is_admin());

drop policy if exists "me gusta públicos" on public.post_likes;
create policy "me gusta públicos" on public.post_likes for select using (true);
drop policy if exists "dar me gusta" on public.post_likes;
create policy "dar me gusta" on public.post_likes for insert with check (user_id = auth.uid());
drop policy if exists "quitar me gusta" on public.post_likes;
create policy "quitar me gusta" on public.post_likes for delete using (user_id = auth.uid());

drop policy if exists "comentarios públicos" on public.post_comments;
create policy "comentarios públicos" on public.post_comments for select using (true);
drop policy if exists "comentar" on public.post_comments;
create policy "comentar" on public.post_comments for insert with check (author_id = auth.uid() or public.is_admin());
drop policy if exists "borrar comentario" on public.post_comments;
create policy "borrar comentario" on public.post_comments for delete
  using (author_id = auth.uid() or public.is_admin()
         or exists (select 1 from public.posts p where p.id = post_id and public.owns_business(p.business_id)));

drop policy if exists "preguntas públicas" on public.questions;
create policy "preguntas públicas" on public.questions for select using (not hidden or author_id = auth.uid() or public.is_admin());
drop policy if exists "preguntar" on public.questions;
create policy "preguntar" on public.questions for insert with check (author_id = auth.uid() or public.is_admin());
drop policy if exists "moderar preguntas" on public.questions;
create policy "moderar preguntas" on public.questions for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "respuestas públicas" on public.answers;
create policy "respuestas públicas" on public.answers for select using (true);
drop policy if exists "responder" on public.answers;
create policy "responder" on public.answers for insert with check (public.owns_business(business_id) or public.is_admin());
drop policy if exists "editar mi respuesta" on public.answers;
create policy "editar mi respuesta" on public.answers for update
  using (public.owns_business(business_id) or public.is_admin()) with check (public.owns_business(business_id) or public.is_admin());

drop policy if exists "útiles públicos" on public.answer_helpful;
create policy "útiles públicos" on public.answer_helpful for select using (true);
drop policy if exists "marcar útil" on public.answer_helpful;
create policy "marcar útil" on public.answer_helpful for insert with check (user_id = auth.uid());
drop policy if exists "quitar útil" on public.answer_helpful;
create policy "quitar útil" on public.answer_helpful for delete using (user_id = auth.uid());

drop policy if exists "ver solicitudes" on public.requests;
create policy "ver solicitudes" on public.requests for select
  using (customer_id = auth.uid() or public.owns_business(business_id) or public.is_admin());
drop policy if exists "pedir cita o cotización" on public.requests;
create policy "pedir cita o cotización" on public.requests for insert
  with check (customer_id = auth.uid() and status = 'nueva' and quoted_price is null);
drop policy if exists "responder solicitud" on public.requests;
create policy "responder solicitud" on public.requests for update
  using (customer_id = auth.uid() or public.owns_business(business_id))
  with check (customer_id = auth.uid() or public.owns_business(business_id));

-- ─────────────────────────────────────────────────────────────
-- Permisos
-- ─────────────────────────────────────────────────────────────
grant select on public.specialties, public.business_photos, public.posts, public.post_likes,
  public.post_comments, public.questions, public.answers, public.answer_helpful
  to anon, authenticated;
grant insert, update, delete on public.specialties, public.business_photos, public.posts to authenticated;
grant insert, delete on public.post_likes, public.post_comments, public.answer_helpful to authenticated;
grant insert, update on public.questions, public.answers to authenticated;
grant select, insert, update on public.requests, public.business_claims to authenticated;

grant execute on function public.my_business_slug() to authenticated;

-- ════════ supabase/migrations/20261025000000_mensualidades.sql ════════
-- Expertalia 360 · mensualidades de los negocios
-- Cada negocio tiene un plan de paga (estandar, premium, vip) y una fecha "pagado hasta".
-- Al registrarse tiene 30 días de prueba.
-- 1. El negocio avisa que pagó (transferencia, depósito o efectivo) y sube su comprobante.
-- 2. El administrador lo confirma y la fecha se recorre solita 1, 3 o 12 meses.
-- 3. Todos los días, a las 6:00, la base revisa a todos:
--      faltan 5 días o menos  → por_vencer   (la app le avisa al negocio)
--      ya venció              → vencido      (7 días de gracia; sigue con su plan)
--      venció hace más de 7   → suspendido   (se oculta del directorio; sus datos y reseñas se guardan)
--    Al volver a pagar, vuelve a aparecer.

create table if not exists public.plans (
  id text primary key,
  name text not null,
  monthly_price numeric(10, 2) not null default 0,
  features text[] not null default '{}',
  position int not null default 0
);

-- monthly_price = profesionistas; monthly_price_oficios = oficios (más económico)
alter table public.plans add column if not exists monthly_price_oficios numeric(10, 2) not null default 0;
insert into public.plans (id, name, monthly_price, monthly_price_oficios, features, position) values
  ('estandar', 'Estándar', 199, 99, array['Perfil con fotos y especialidades', 'Pin en el mapa', 'Reseñas y agenda', 'Hasta 5 servicios'], 1),
  ('premium', 'Premium', 399, 199, array['Todo lo de Estándar', 'Servicios y paquetes ilimitados', 'Sales antes en las búsquedas', 'Muro y 3 promociones al mes', 'Estadísticas de tu perfil'], 2),
  ('vip', 'VIP', 799, 399, array['Todo lo de Premium', 'Primero en tu especialidad', 'Campañas a tus clientes', 'Varios colaboradores', '10% de descuento en espacios'], 3)
on conflict (id) do update set name = excluded.name, monthly_price = excluded.monthly_price, monthly_price_oficios = excluded.monthly_price_oficios, features = excluded.features, position = excluded.position;

alter table public.businesses
  add column if not exists paid_until date,
  add column if not exists plan_status text not null default 'al_corriente'
    check (plan_status in ('al_corriente', 'por_vencer', 'vencido', 'suspendido')),
  -- Oculto del directorio por falta de pago (aparte de "status", que usa el administrador para moderar)
  add column if not exists hidden_unpaid boolean not null default false,
  add column if not exists paid_plan text references public.plans (id); -- plan que pagó (para regresarlo al pagar)

create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  plan text not null references public.plans (id),
  months int not null default 1 check (months between 1 and 12),
  amount numeric(10, 2) not null check (amount >= 0),
  method text not null default 'transferencia' check (method in ('transferencia', 'deposito', 'efectivo', 'tarjeta', 'mercadopago', 'stripe')),
  reference text,
  receipt_path text,                        -- comprobante en el bucket privado "comprobantes"
  status text not null default 'pendiente' check (status in ('pendiente', 'pagado', 'rechazado')),
  note text,
  period_start date,
  period_end date,
  created_by uuid references public.profiles (id) default auth.uid(),
  confirmed_by uuid references public.profiles (id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists subscription_payments_business_idx on public.subscription_payments (business_id, created_at desc);
create index if not exists subscription_payments_status_idx on public.subscription_payments (status, created_at desc);

-- El estado se calcula siempre igual (en la base y en la app)
create or replace function public.billing_status(p_plan text, p_paid_until date)
returns text
language sql immutable
as $$
  select case
    when p_paid_until is null then 'vencido'
    when p_paid_until - current_date > 5 then 'al_corriente'
    when p_paid_until >= current_date then 'por_vencer'
    when current_date - p_paid_until <= 7 then 'vencido'
    else 'suspendido'
  end;
$$;

-- Revisión diaria: actualiza estados y oculta del directorio a quien lleva más de 7 días vencido
create or replace function public.refresh_billing()
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  n int;
begin
  update public.businesses b
  set plan_status = public.billing_status(coalesce(b.paid_plan, b.plan), b.paid_until),
      hidden_unpaid = public.billing_status(coalesce(b.paid_plan, b.plan), b.paid_until) = 'suspendido';
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Confirmar un pago (solo administrador): recorre la fecha y vuelve a mostrar el perfil
create or replace function public.confirm_subscription_payment(p_payment uuid)
returns date
language plpgsql security definer set search_path = ''
as $$
declare
  pay public.subscription_payments;
  start_date date;
  end_date date;
begin
  if not public.is_admin() then
    raise exception 'Solo el administrador confirma pagos';
  end if;
  select * into pay from public.subscription_payments where id = p_payment for update;
  if pay.id is null or pay.status = 'pagado' then
    raise exception 'Pago no encontrado o ya confirmado';
  end if;
  select greatest(coalesce(paid_until, current_date), current_date) into start_date from public.businesses where id = pay.business_id;
  end_date := (start_date + make_interval(months => pay.months))::date;
  update public.subscription_payments
  set status = 'pagado', confirmed_by = auth.uid(), confirmed_at = now(), period_start = start_date, period_end = end_date
  where id = p_payment;
  update public.businesses
  set paid_until = end_date, plan = pay.plan, paid_plan = pay.plan, plan_status = public.billing_status(pay.plan, end_date), hidden_unpaid = false
  where id = pay.business_id;
  return end_date;
end;
$$;

-- El dueño no cambia su fecha de pago ni su estado (se agrega a la protección existente)
create or replace function public.businesses_protect_fields()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if session_user <> 'authenticator' or public.is_admin() or coalesce(current_setting('expertalia.rating', true), 'off') = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.verified := false;
    new.plan := 'estandar';
    new.rating_avg := 0;
    new.rating_count := 0;
    -- 30 días de prueba con el plan Estándar
    new.paid_until := current_date + 30;
    new.paid_plan := 'estandar';
    new.plan_status := 'al_corriente';
    new.hidden_unpaid := false;
    return new;
  end if;
  new.verified := old.verified;
  new.status := old.status;
  new.plan := old.plan;
  new.rating_avg := old.rating_avg;
  new.rating_count := old.rating_count;
  new.owner_id := old.owner_id;
  new.paid_until := old.paid_until;
  new.paid_plan := old.paid_plan;
  new.plan_status := old.plan_status;
  new.hidden_unpaid := old.hidden_unpaid;
  return new;
end;
$$;

-- Cuántas categorías puede tener cada negocio según su plan (la principal cuenta): Estándar 1, Premium 3, VIP 6.
alter table public.plans add column if not exists max_categories int not null default 1;
update public.plans set max_categories = case id when 'estandar' then 1 when 'premium' then 3 when 'vip' then 6 else 1 end;

create or replace function public.businesses_limit_categories()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  max_extra int;
begin
  -- Sin repetir la principal ni categorías que no existen
  new.extra_categories := coalesce(array(
    select t.c from unnest(new.extra_categories) with ordinality as t(c, o)
    where t.c <> coalesce((select slug from public.categories where id = new.category_id), '')
      -- solo categorías del mismo mundo que la principal (un abogado nunca sale en oficios)
      and exists (select 1 from public.categories x where x.slug = t.c
                  and x.world = (select world from public.categories where id = new.category_id))
    group by t.c order by min(t.o)
  ), '{}');
  if session_user <> 'authenticator' or public.is_admin() then
    return new;
  end if;
  select coalesce(max_categories, 1) - 1 into max_extra from public.plans where id = new.plan;
  if coalesce(array_length(new.extra_categories, 1), 0) > coalesce(max_extra, 0) then
    new.extra_categories := new.extra_categories[1:coalesce(max_extra, 0)];
  end if;
  return new;
end;
$$;

drop trigger if exists businesses_categories_limit on public.businesses;
create trigger businesses_categories_limit
  before insert or update of extra_categories, plan, category_id on public.businesses
  for each row execute function public.businesses_limit_categories();

-- Al bajar a Estándar por falta de pago, conserva sus categorías extra guardadas pero solo cuenta la principal
create or replace function public.business_categories(b public.businesses)
returns text[]
language sql stable set search_path = ''
as $$
  select array[(select slug from public.categories where id = b.category_id)]
    || case when b.plan = 'estandar' then '{}'::text[] else b.extra_categories[1:(select max_categories - 1 from public.plans where id = b.plan)] end;
$$;

-- Comprobantes: bucket privado; el dueño sube a la carpeta de su negocio, solo él y el admin los ven
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprobantes', 'comprobantes', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = false;

drop policy if exists "comprobantes: el dueño sube" on storage.objects;
create policy "comprobantes: el dueño sube" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'comprobantes' and public.owns_photo_folder(name));

drop policy if exists "comprobantes: dueño y admin ven" on storage.objects;
create policy "comprobantes: dueño y admin ven" on storage.objects
  for select to authenticated
  using (bucket_id = 'comprobantes' and public.owns_photo_folder(name));

-- RLS
alter table public.plans enable row level security;
alter table public.subscription_payments enable row level security;

drop policy if exists "planes públicos" on public.plans;
create policy "planes públicos" on public.plans for select using (true);
drop policy if exists "planes admin" on public.plans;
create policy "planes admin" on public.plans for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "ver mis pagos" on public.subscription_payments;
create policy "ver mis pagos" on public.subscription_payments for select
  using (public.owns_business(business_id) or public.is_admin());
drop policy if exists "avisar que pagué" on public.subscription_payments;
create policy "avisar que pagué" on public.subscription_payments for insert
  with check ((public.owns_business(business_id) and status = 'pendiente' and confirmed_at is null) or public.is_admin());
drop policy if exists "admin revisa pagos" on public.subscription_payments;
create policy "admin revisa pagos" on public.subscription_payments for update
  using (public.is_admin()) with check (public.is_admin());

grant select on public.plans to anon, authenticated;
grant insert, update, delete on public.plans to authenticated;
grant select, insert, update on public.subscription_payments to authenticated;
grant execute on function public.confirm_subscription_payment(uuid) to authenticated;
grant execute on function public.billing_status(text, date) to anon, authenticated;

-- Los negocios que ya existían arrancan con 30 días
update public.businesses set paid_until = current_date + 30, paid_plan = plan, plan_status = 'al_corriente'
where paid_until is null;

-- El directorio público no muestra a quien está oculto por falta de pago (el dueño y el admin sí lo ven)
drop policy if exists "negocios activos públicos" on public.businesses;
create policy "negocios activos públicos" on public.businesses for select
  using ((status = 'activo' and not hidden_unpaid) or owner_id = auth.uid() or public.is_admin());

-- Revisión automática diaria (6:00 hora del centro de México = 12:00 UTC).
-- Requiere la extensión pg_cron (Supabase → Database → Extensions → pg_cron). Si no está, se omite.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'expertalia-mensualidades';
  perform cron.schedule('expertalia-mensualidades', '0 12 * * *', 'select public.refresh_billing()');
exception when others then
  raise notice 'pg_cron no disponible: activa la extensión y corre de nuevo este bloque (%).', sqlerrm;
end;
$$;

-- ════════ supabase/migrations/20261026000000_cobro_automatico.sql ════════
-- Expertalia 360 · cobro automático con tarjeta (Mercado Pago), avisos por correo,
-- altas hechas por el administrador y beneficios reales de cada nivel.
--
-- Cómo funciona el cobro con tarjeta:
--   1. El negocio toca "Pagar con tarjeta" en Mi plan. La función mp-suscripcion crea una
--      suscripción en Mercado Pago y le regresa la liga para meter su tarjeta.
--   2. Cada mes Mercado Pago cobra solo y avisa a la función mp-webhook.
--   3. mp-webhook llama a apply_mp_payment: se registra el pago como "pagado" y la fecha
--      se recorre un mes. No tienes que confirmar nada.
-- La transferencia sigue igual (el negocio avisa "Ya pagué" y tú confirmas).

-- ───────────── Suscripción de Mercado Pago de cada negocio ─────────────
alter table public.businesses
  add column if not exists mp_preapproval_id text,
  add column if not exists mp_status text check (mp_status in ('pendiente', 'activo', 'pausado', 'cancelado')),
  add column if not exists mp_plan text references public.plans (id),
  -- Correo de contacto para perfiles que dio de alta el administrador (aún sin dueño)
  add column if not exists contact_email text,
  add column if not exists created_by_admin boolean not null default false;
create unique index if not exists businesses_mp_preapproval_idx on public.businesses (mp_preapproval_id) where mp_preapproval_id is not null;

-- Cada cobro de Mercado Pago se registra una sola vez aunque el aviso llegue repetido
alter table public.subscription_payments add column if not exists external_id text;
create unique index if not exists subscription_payments_external_idx on public.subscription_payments (external_id) where external_id is not null;

-- ¿La llamada viene de una función del servidor con la llave de servicio? (Mercado Pago, avisos)
create or replace function public.is_service()
returns boolean
language sql stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''),
                  nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') = 'service_role';
$$;

-- El dueño tampoco cambia su suscripción a mano (solo las funciones del servidor)
create or replace function public.businesses_protect_fields()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if session_user <> 'authenticator' or public.is_admin() or public.is_service() or coalesce(current_setting('expertalia.rating', true), 'off') = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.verified := false;
    new.plan := 'estandar';
    new.rating_avg := 0;
    new.rating_count := 0;
    -- 30 días de prueba con el plan Estándar
    new.paid_until := current_date + 30;
    new.paid_plan := 'estandar';
    new.plan_status := 'al_corriente';
    new.hidden_unpaid := false;
    new.mp_preapproval_id := null;
    new.mp_status := null;
    new.mp_plan := null;
    new.created_by_admin := false;
    return new;
  end if;
  new.verified := old.verified;
  new.status := old.status;
  new.plan := old.plan;
  new.rating_avg := old.rating_avg;
  new.rating_count := old.rating_count;
  new.owner_id := old.owner_id;
  new.paid_until := old.paid_until;
  new.paid_plan := old.paid_plan;
  new.plan_status := old.plan_status;
  new.hidden_unpaid := old.hidden_unpaid;
  new.mp_preapproval_id := old.mp_preapproval_id;
  new.mp_status := old.mp_status;
  new.mp_plan := old.mp_plan;
  new.created_by_admin := old.created_by_admin;
  return new;
end;
$$;

-- Lo llama mp-webhook (con la llave de servicio) cuando Mercado Pago cobró una mensualidad.
-- Registra el pago y recorre la fecha un mes. Si ese cobro ya estaba registrado, no hace nada.
create or replace function public.apply_mp_payment(p_preapproval text, p_amount numeric, p_external_id text, p_paid_at timestamptz default now())
returns date
language plpgsql security definer set search_path = ''
as $$
declare
  biz public.businesses;
  start_date date;
  end_date date;
  the_plan text;
begin
  if exists (select 1 from public.subscription_payments where external_id = p_external_id) then
    return null;
  end if;
  select * into biz from public.businesses where mp_preapproval_id = p_preapproval for update;
  if biz.id is null then
    raise exception 'No hay negocio con la suscripción %', p_preapproval;
  end if;
  the_plan := coalesce(biz.mp_plan, biz.paid_plan, biz.plan);
  start_date := greatest(coalesce(biz.paid_until, current_date), current_date);
  end_date := (start_date + interval '1 month')::date;
  insert into public.subscription_payments
    (business_id, plan, months, amount, method, reference, status, period_start, period_end, confirmed_at, created_by, external_id, created_at)
  values
    (biz.id, the_plan, 1, p_amount, 'mercadopago', 'Cobro automático Mercado Pago #' || p_external_id, 'pagado', start_date, end_date, now(), null, p_external_id, p_paid_at);
  update public.businesses
  set paid_until = end_date, plan = the_plan, paid_plan = the_plan, mp_status = 'activo',
      plan_status = public.billing_status(the_plan, end_date), hidden_unpaid = false
  where id = biz.id;
  return end_date;
end;
$$;
revoke all on function public.apply_mp_payment(text, numeric, text, timestamptz) from public, anon, authenticated;
grant execute on function public.apply_mp_payment(text, numeric, text, timestamptz) to service_role;

-- ───────────── Avisos por correo ─────────────
-- Qué aviso se mandó a quién (para no repetirlo). kind: aviso (5 días antes), vencio, oculto.
create table if not exists public.billing_notices (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses (id) on delete cascade,
  kind text not null check (kind in ('aviso', 'vencio', 'oculto', 'resumen')),
  paid_until date,
  email text,
  sent_at timestamptz not null default now(),
  unique (business_id, kind, paid_until)
);
alter table public.billing_notices enable row level security;
drop policy if exists "avisos: admin" on public.billing_notices;
create policy "avisos: admin" on public.billing_notices for select using (public.is_admin());
grant select on public.billing_notices to authenticated;

-- A quién hay que avisarle hoy (lo usa la función avisos-mensualidades con la llave de servicio).
-- Quien paga con tarjeta automática y está al corriente no recibe aviso de "por vencer".
create or replace function public.billing_notice_queue()
returns table (business_id uuid, slug text, name text, email text, owner_name text, kind text, paid_until date, plan text, price numeric, auto boolean)
language sql stable security definer set search_path = ''
as $$
  with b as (
    select x.*, public.billing_status(coalesce(x.paid_plan, x.plan), x.paid_until) as st,
           coalesce(u.email, x.contact_email) as mail, p.full_name,
           case when c.world = 'oficios' then pl.monthly_price_oficios else pl.monthly_price end as precio
    from public.businesses x
    left join auth.users u on u.id = x.owner_id
    left join public.profiles p on p.id = x.owner_id
    left join public.categories c on c.id = x.category_id
    left join public.plans pl on pl.id = coalesce(x.paid_plan, x.plan)
    where x.status = 'activo'
  ), k as (
    select b.*, case
      when b.st = 'por_vencer' and coalesce(b.mp_status, '') <> 'activo' then 'aviso'
      when b.st = 'vencido' then 'vencio'
      when b.st = 'suspendido' then 'oculto'
    end as kind
    from b
  )
  select k.id, k.slug, k.name, k.mail, k.full_name, k.kind, k.paid_until, coalesce(k.paid_plan, k.plan), k.precio, coalesce(k.mp_status, '') = 'activo'
  from k
  where k.kind is not null and k.mail is not null
    and not exists (select 1 from public.billing_notices n where n.business_id = k.id and n.kind = k.kind and n.paid_until is not distinct from k.paid_until);
$$;
revoke all on function public.billing_notice_queue() from public, anon, authenticated;
grant execute on function public.billing_notice_queue() to service_role;

-- ───────────── Administración: altas, verificación, reclamos ─────────────
-- El administrador puede preparar módulos, horarios, servicios y personal de los perfiles que da de alta
drop policy if exists "módulos admin" on public.business_modules;
create policy "módulos admin" on public.business_modules for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "horarios admin" on public.business_hours;
create policy "horarios admin" on public.business_hours for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "catálogo admin" on public.catalog_items;
create policy "catálogo admin" on public.catalog_items for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "personal admin" on public.staff;
create policy "personal admin" on public.staff for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "fotos admin" on storage.objects;
create policy "fotos admin" on storage.objects for all to authenticated
  using (bucket_id in ('fotos', 'comprobantes') and public.is_admin())
  with check (bucket_id in ('fotos', 'comprobantes') and public.is_admin());

-- El administrador ve el correo y nombre de quien reclama un perfil (vista solo para admin)
create or replace function public.admin_claims()
returns table (id uuid, business_id uuid, business_slug text, business_name text, user_id uuid, user_name text, user_email text, license text, note text, status text, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.business_id, b.slug, b.name, c.user_id, p.full_name, u.email, c.license, c.note, c.status, c.created_at
  from public.business_claims c
  join public.businesses b on b.id = c.business_id
  left join public.profiles p on p.id = c.user_id
  left join auth.users u on u.id = c.user_id
  where public.is_admin()
  order by c.created_at desc;
$$;
grant execute on function public.admin_claims() to authenticated;

-- Al aprobar un reclamo, los demás reclamos del mismo perfil se rechazan
create or replace function public.business_claims_apply()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'aprobada' and old.status <> 'aprobada' then
    update public.businesses set owner_id = new.user_id, license = coalesce(license, new.license) where id = new.business_id;
    update public.profiles set role = 'negocio' where id = new.user_id and role = 'vecino';
    update public.business_claims set status = 'rechazada' where business_id = new.business_id and id <> new.id and status = 'pendiente';
  end if;
  return new;
end;
$$;

-- ───────────── Beneficios de cada nivel ─────────────
-- Estándar: hasta 5 servicios. Premium y VIP: ilimitados.
create or replace function public.catalog_items_plan_limit()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  p text;
begin
  if session_user <> 'authenticator' or public.is_admin() or public.is_service() then
    return new;
  end if;
  select plan into p from public.businesses where id = new.business_id;
  if p = 'estandar' and (select count(*) from public.catalog_items where business_id = new.business_id) >= 5 then
    raise exception 'Con el plan Estándar puedes tener hasta 5 servicios. Sube a Premium para tener ilimitados.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists catalog_items_limit on public.catalog_items;
create trigger catalog_items_limit before insert on public.catalog_items
  for each row execute function public.catalog_items_plan_limit();

-- Muro: Premium y VIP publican; Estándar no.
create or replace function public.posts_plan_limit()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if session_user <> 'authenticator' or public.is_admin() or public.is_service() then
    return new;
  end if;
  if (select plan from public.businesses where id = new.business_id) = 'estandar' then
    raise exception 'Publicar en el muro es parte del plan Premium.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists posts_limit on public.posts;
create trigger posts_limit before insert on public.posts
  for each row execute function public.posts_plan_limit();

-- ════════ supabase/seed.sql ════════
-- Datos base de Expertalia 360: zonas, categorías (profesionistas y oficios) y especialidades.
-- Generado por apps/mobile/scripts/generate-demo-seed.ts a partir de src/data/mock.ts

insert into public.zones (name, municipality, state, slug) values
  ('Querétaro Centro', 'Querétaro', 'Querétaro', 'queretaro-centro'),
  ('Centro Sur', 'Querétaro', 'Querétaro', 'centro-sur'),
  ('Centro Histórico', 'Querétaro', 'Querétaro', 'centro-historico'),
  ('Juriquilla', 'Querétaro', 'Querétaro', 'juriquilla'),
  ('El Marqués', 'Querétaro', 'Querétaro', 'el-marques')
on conflict (slug) do nothing;

insert into public.categories (name, slug, color, icon, position, world, professional, emoji, ink) values ('Abogados', 'abogados', '#1F3A68', 'briefcase-outline', 1, 'profesionales', 'Abogado', 'balanza', '#FFFFFF')
  on conflict (slug) do update set name = excluded.name, color = excluded.color, icon = excluded.icon, position = excluded.position, world = excluded.world, professional = excluded.professional, emoji = excluded.emoji, ink = excluded.ink;
insert into public.specialties (category_id, name, emoji, keywords, position) select id, 'Familiar', 'familia', array['divorcio', 'pensión', 'pension', 'custodia', 'patria potestad', 'adopción']::text[], 0 from public.categories where slug = 'abogados' on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;
insert into public.specialties (category_id, name, emoji, keywords, position) select id, 'Laboral', 'portafolio', array['despido', 'finiquito', 'liquidación', 'demanda laboral', 'trabajo', 'imss']::text[], 1 from public.categories where slug = 'abogados' on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;
insert into public.specialties (category_id, name, emoji, keywords, position) select id, 'Mercantil y corporativo', 'edificio', array['empresa', 'sociedad', 'contrato', 'socios', 'cobranza', 'pagaré']::text[], 2 from public.categories where slug = 'abogados' on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;
insert into public.specialties (category_id, name, emoji, keywords, position) select id, 'Penal', 'candado', array['denuncia', 'delito', 'detenido', 'fraude', 'amparo']::text[], 3 from public.categories where slug = 'abogados' on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;
insert into public.specialties (category_id, name, emoji, keywords, position) select id, 'Civil e inmobiliario', 'casa', array['arrendamiento', 'renta', 'inquilino', 'compraventa', 'herencia', 'testamento', 'juicio']::text[], 4 from public.categories where slug = 'abogados' on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;
insert into public.specialties (category_id, name, emoji, keywords, position) select id, 'Migratorio', 'mundo', array['visa', 'residencia', 'migración', 'pasaporte', 'naturalización']::text[], 5 from public.categories where slug = 'abogados' on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;
insert into public.specialties (category_id, name, emoji, keywords, position) select id, 'Fiscal', 'gobierno', array['sat', 'multa', 'crédito fiscal', 'embargo']::text[], 6 from public.categories where slug = 'abogados' on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;

insert into public.categories (name, slug, color, icon, position, world, professional, emoji, ink) values ('Contadores', 'contadores', '#1E8E6A', 'calculator-outline', 2, 'profesionales', 'Contador', 'abaco', '#FFFFFF')
  on conflict (slug) do update set name = excluded.name, color = excluded.color, icon = excluded.icon, position = excluded.position, world = excluded.world, professional = excluded.professional, emoji = excluded.emoji, ink = excluded.ink;
insert into public.specialties (category_id, name, emoji, keywords, position) select id, 'Declaración anual', 'recibo', array['declaración', 'declaracion', 'saldo a favor', 'devolución', 'impuestos']::text[], 0 from public.categories where slug = 'contadores' on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;
insert into public.specialties (category_id, name, emoji, keywords, position) select id, 'RESICO y personas físicas', 'laptop', array['resico', 'freelance', 'honorarios', 'arrendamiento']::text[], 1 from public.categories where slug = 'contadores' on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;
insert into public.specialties (category_id, name, emoji, keywords, position) select id, 'Contabilidad de empresas', 'grafica', array['contabilidad', 'pyme', 'empresa', 'balance']::text[], 2 from public.categories where slug = 'contadores' on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;
insert into public.specialties (category_id, name, emoji, keywords, position) select id, 'Nómina e IMSS', 'personas', array['nómina', 'nomina', 'imss', 'infonavit', 'empleados']::text[], 3 from public.categories where slug = 'contadores' on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;
insert into public.specialties (category_id, name, emoji, keywords, position) select id, 'Defensa ante el SAT', 'escudo', array['requerimiento', 'sat', 'multa', 'auditoría', 'buzón tributario']::text[], 4 from public.categories where slug = 'contadores' on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;
insert into public.specialties (category_id, name, emoji, keywords, position) select id, 'Facturación', 'recibo', array['factura', 'cfdi', 'timbrado']::text[], 5 from public.categories where slug = 'contadores' on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;

insert into public.categories (name, slug, color, icon, position, world, professional, emoji, ink) values ('Notarías y trámites', 'notarias-y-tramites', '#E3B04B', 'document-text-outline', 3, 'profesionales', 'Notario o gestor', 'pergamino', '#121A2B')
  on conflict (slug) do update set name = excluded.name, color = excluded.color, icon = excluded.icon, position = excluded.position, world = excluded.world, professional = excluded.professional, emoji = excluded.emoji, ink = excluded.ink;
insert into public.specialties (category_id, name, emoji, keywords, position) select id, 'Escrituras', 'casa', array['escritura', 'compraventa', 'casa', 'terreno']::text[], 0 from public.categories where slug = 'notarias-y-tramites' on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;
insert into public.specialties (category_id, name, emoji, keywords, position) select id, 'Testamentos', 'pergamino', array['testamento', 'herencia']::text[], 1 from public.categories where slug = 'notarias-y-tramites' on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;
insert into public.specialties (category_id, name, emoji, keywords, position) select id, 'Poderes notariales', 'nota', array['poder', 'carta poder']::text[], 2 from public.categories where slug = 'notarias-y-tramites' on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;
insert into public.specialties (category_id, name, emoji, keywords, position) select id, 'Traducción certificada', 'globo_texto', array['traducción', 'traduccion', 'perito traductor', 'apostilla']::text[], 3 from public.categories where slug = 'notarias-y-tramites' on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;
insert into public.specialties (category_id, name, emoji, keywords, position) select id, 'Gestoría', 'portapapeles', array['placas', 'licencia', 'cita sat', 'e.firma', 'trámite']::text[], 4 from public.categories where slug = 'notarias-y-tramites' on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;

insert into public.categories (name, slug, color, icon, position, world, professional, emoji, ink) values ('Psicología y salud', 'psicologia-y-salud', '#C2477A', 'heart-outline', 4, 'profesionales', 'Especialista', 'cerebro', '#FFFFFF')
  on conflict (slug) do update set name = excluded.name, color = excluded.color, icon = excluded.icon, position = excluded.position, world = excluded.world, professional = excluded.professional, emoji = excluded.emoji, ink = excluded.ink;
insert into public.specialties (category_id, name, emoji, keywords, position) select id, 'Terapia individual', 'cerebro', array['terapia', 'psicólogo', 'psicologo', 'depresión']::text[], 0 from public.categories where slug = 'psicologia-y-salud' on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;
insert into public.specialties (category_id, name, emoji, keywords, position) select id, 'Terapia de pareja', 'anillo', array['pareja', 'matrimonio']::text[], 1 from public.categories where slug = 'psicologia-y-salud' on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;
insert into public.specialties (category_id, name, emoji, keywords, position) select id, 'Ansiedad y estrés', 'pensando', array['ansiedad', 'estrés', 'estres', 'pánico']::text[], 2 from public.categories where slug = 'psicologia-y-salud' on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;
insert into public.specialties (category_id, name, emoji, keywords, position) select id, 'Nutrición', 'regadera', array['nutriólogo', 'dieta', 'nutricion']::text[], 3 from public.categories where slug = 'psicologia-y-salud' on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;
insert into public.specialties (category_id, name, emoji, keywords, position) select id, 'Fisioterapia', 'hospital', array['fisioterapia', 'lesión', 'rehabilitación', 'espalda']::text[], 4 from public.categories where slug = 'psicologia-y-salud' on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;

insert into public.categories (name, slug, color, icon, position, world, professional, emoji, ink) values ('Arquitectura e ingeniería', 'arquitectura', '#121A2B', 'business-outline', 5, 'profesionales', 'Arquitecto o ingeniero', 'construccion', '#E3B04B')
  on conflict (slug) do update set name = excluded.name, color = excluded.color, icon = excluded.icon, position = excluded.position, world = excluded.world, professional = excluded.professional, emoji = excluded.emoji, ink = excluded.ink;
insert into public.specialties (category_id, name, emoji, keywords, position) select id, 'Proyecto arquitectónico', 'escuadra', array['planos', 'diseño', 'casa nueva']::text[], 0 from public.categories where slug = 'arquitectura' on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;
insert into public.specialties (category_id, name, emoji, keywords, position) select id, 'Licencias de construcción', 'portapapeles', array['licencia', 'permiso', 'construcción']::text[], 1 from public.categories where slug = 'arquitectura' on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;
insert into public.specialties (category_id, name, emoji, keywords, position) select id, 'Remodelación', 'ladrillos', array['remodelar', 'ampliación', 'cocina', 'baño']::text[], 2 from public.categories where slug = 'arquitectura' on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;
insert into public.specialties (category_id, name, emoji, keywords, position) select id, 'Avalúos', 'dinero', array['avalúo', 'avaluo', 'valor de mi casa']::text[], 3 from public.categories where slug = 'arquitectura' on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;
insert into public.specialties (category_id, name, emoji, keywords, position) select id, 'Cálculo estructural', 'construccion', array['estructura', 'grietas', 'cimentación']::text[], 4 from public.categories where slug = 'arquitectura' on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;

insert into public.categories (name, slug, color, icon, position, world, professional, emoji, ink) values ('Consultoría y seguros', 'consultoria', '#6B4FC8', 'trending-up-outline', 6, 'profesionales', 'Consultor', 'grafica', '#FFFFFF')
  on conflict (slug) do update set name = excluded.name, color = excluded.color, icon = excluded.icon, position = excluded.position, world = excluded.world, professional = excluded.professional, emoji = excluded.emoji, ink = excluded.ink;
insert into public.specialties (category_id, name, emoji, keywords, position) select id, 'Mejora de procesos', 'grafica', array['procesos', 'eficiencia', 'costos', 'indicadores']::text[], 0 from public.categories where slug = 'consultoria' on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;
insert into public.specialties (category_id, name, emoji, keywords, position) select id, 'Finanzas para PyME', 'dinero', array['finanzas', 'flujo', 'crédito', 'precios']::text[], 1 from public.categories where slug = 'consultoria' on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;
insert into public.specialties (category_id, name, emoji, keywords, position) select id, 'Marketing digital', 'megafono', array['redes sociales', 'publicidad', 'página web', 'marketing']::text[], 2 from public.categories where slug = 'consultoria' on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;
insert into public.specialties (category_id, name, emoji, keywords, position) select id, 'Seguros de gastos médicos', 'hospital', array['seguro médico', 'gastos médicos', 'hospital']::text[], 3 from public.categories where slug = 'consultoria' on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;
insert into public.specialties (category_id, name, emoji, keywords, position) select id, 'Seguros de vida y retiro', 'escudo', array['seguro de vida', 'retiro', 'ahorro', 'afore']::text[], 4 from public.categories where slug = 'consultoria' on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;

-- ════════ supabase/seed_demo.sql ════════
-- Profesionistas y oficios de ejemplo (ficticios) para probar la app.
-- Generado por apps/mobile/scripts/generate-demo-seed.ts a partir de src/data/mock.ts
-- No tienen dueño: cualquier profesional real puede "reclamar" su perfil desde la app.
-- Para borrarlos todos: delete from public.businesses where owner_id is null;

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo,
  profession, specialties, extra_categories, years_exp, license, education, languages, attends, consult_price, response_time, directions, urgent24, warranty, payment_info, logo_url, cover_url)
select 'Lic. Mariana Ortiz', 'lic-mariana-ortiz', 'Abogada · familiar y civil', 'Te acompaño en divorcios, pensiones alimenticias, custodia, testamentos y juicios de arrendamiento. Explico cada paso con claridad y te doy cotización por escrito antes de empezar.',
  (select id from public.categories where slug = 'abogados'),
  (select id from public.zones where slug = 'queretaro-centro'),
  '5214420000101', '5214420000101', 'Plaza Zen, local 8',
  extensions.st_setsrid(extensions.st_makepoint(-100.3254, 20.6012), 4326)::extensions.geography,
  true, true, false, 'premium', 'activo', true, 'Primera consulta en línea a $350',
  'Abogada', array['Familiar', 'Civil e inmobiliario']::text[], '{}'::text[], 12, 'Cédula 7845120', 'Licenciatura en Derecho, UAQ · Maestría en Derecho Familiar', array['Español', 'Inglés']::text[], array['despacho', 'en_linea']::text[], 500, 'Responde en menos de 2 h', 'Plaza Zen, planta alta, local 8. Frente al Oxxo; hay estacionamiento de la plaza.', false, null, 'BBVA · CLABE 012 680 0123 4567 8901 · a nombre de Mariana Ortiz Lara', null, null
where not exists (select 1 from public.businesses where slug = 'lic-mariana-ortiz');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'lic-mariana-ortiz'), 'reservar') on conflict do nothing;
insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'lic-mariana-ortiz'), 'cotizar') on conflict do nothing;
insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'lic-mariana-ortiz'), 'consulta') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'lic-mariana-ortiz'), 1, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'lic-mariana-ortiz'), 2, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'lic-mariana-ortiz'), 3, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'lic-mariana-ortiz'), 4, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'lic-mariana-ortiz'), 5, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'lic-mariana-ortiz'), 6, '09:00', '18:00') on conflict do nothing;
insert into public.staff (business_id, name) select (select id from public.businesses where slug = 'lic-mariana-ortiz'), 'Lic. Ortiz' where not exists (select 1 from public.staff where business_id = (select id from public.businesses where slug = 'lic-mariana-ortiz') and name = 'Lic. Ortiz');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'lic-mariana-ortiz'), 'cita', 'Consulta inicial', 'En despacho o videollamada', 'Consultas', 500, 45, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'lic-mariana-ortiz') and name = 'Consulta inicial');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'lic-mariana-ortiz'), 'cotizacion', 'Divorcio voluntario', 'Honorarios según el caso', 'Familiar', null, null, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'lic-mariana-ortiz') and name = 'Divorcio voluntario');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'lic-mariana-ortiz'), 'cotizacion', 'Pensión alimenticia', 'Solicitud o modificación', 'Familiar', null, null, true, 2 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'lic-mariana-ortiz') and name = 'Pensión alimenticia');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'lic-mariana-ortiz'), 'cotizacion', 'Testamento', 'Incluye acompañamiento a notaría', 'Civil', null, null, true, 3 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'lic-mariana-ortiz') and name = 'Testamento');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'lic-mariana-ortiz'), 'cotizacion', 'Juicio de arrendamiento', 'Desalojo o cobro de rentas', 'Civil', null, null, true, 4 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'lic-mariana-ortiz') and name = 'Juicio de arrendamiento');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'lic-mariana-ortiz'), 'producto', 'Revisión de contrato de arrendamiento', 'Entrega por escrito en 48 h', 'Paquetes', 900, null, true, 5 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'lic-mariana-ortiz') and name = 'Revisión de contrato de arrendamiento');
insert into public.business_photos (business_id, url, caption, color, position) select (select id from public.businesses where slug = 'lic-mariana-ortiz'), null, 'Sala de juntas del despacho', '#DCE4F2', 0 where not exists (select 1 from public.business_photos where business_id = (select id from public.businesses where slug = 'lic-mariana-ortiz') and caption = 'Sala de juntas del despacho');
insert into public.business_photos (business_id, url, caption, color, position) select (select id from public.businesses where slug = 'lic-mariana-ortiz'), null, 'Recepción', '#E9E2FA', 1 where not exists (select 1 from public.business_photos where business_id = (select id from public.businesses where slug = 'lic-mariana-ortiz') and caption = 'Recepción');
insert into public.loyalty_programs (business_id, kind, goal, percent, reward) select (select id from public.businesses where slug = 'lic-mariana-ortiz'), 'sellos', 5, null, 'Quinta consulta sin costo' where not exists (select 1 from public.loyalty_programs where business_id = (select id from public.businesses where slug = 'lic-mariana-ortiz'));
insert into public.reviews (business_id, author_name, rating, body, reply, created_at) select (select id from public.businesses where slug = 'lic-mariana-ortiz'), 'Claudia R.', 5, 'Me explicó todo con claridad y la cotización llegó el mismo día. Mi divorcio quedó en tres meses.', 'Gracias, Claudia. Fue un gusto acompañarte.', now() - interval '1 months' where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'lic-mariana-ortiz') and author_name = 'Claudia R.' and body = 'Me explicó todo con claridad y la cotización llegó el mismo día. Mi divorcio quedó en tres meses.');
insert into public.reviews (business_id, author_name, rating, body, reply, created_at) select (select id from public.businesses where slug = 'lic-mariana-ortiz'), 'Pedro S.', 5, 'Muy humana en un momento difícil. Siempre contestó mis dudas.', null, now() - interval '2 months' where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'lic-mariana-ortiz') and author_name = 'Pedro S.' and body = 'Muy humana en un momento difícil. Siempre contestó mis dudas.');
insert into public.reviews (business_id, author_name, rating, body, reply, created_at) select (select id from public.businesses where slug = 'lic-mariana-ortiz'), 'Usuario verificado', 4, 'Buena abogada, los tiempos del juzgado se alargaron pero ella me mantuvo informado.', null, now() - interval '3 months' where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'lic-mariana-ortiz') and author_name = 'Usuario verificado' and body = 'Buena abogada, los tiempos del juzgado se alargaron pero ella me mantuvo informado.');
update public.businesses set rating_avg = 5.0, rating_count = 41, verified = true where slug = 'lic-mariana-ortiz';
update public.businesses set plan = 'vip', paid_plan = 'vip', paid_until = current_date + 24, plan_status = public.billing_status('vip', current_date + 24), hidden_unpaid = public.billing_status('vip', current_date + 24) = 'suspendido' where slug = 'lic-mariana-ortiz';
update public.businesses set mp_status = 'activo', mp_plan = 'vip' where slug = 'lic-mariana-ortiz';
insert into public.subscription_payments (business_id, plan, months, amount, method, reference, status, period_end, created_at, created_by) select (select id from public.businesses where slug = 'lic-mariana-ortiz'), 'vip', 1, 799, 'mercadopago', 'Cobro automático Mercado Pago', 'pagado', current_date + 24, now() - interval '190 hours', null where not exists (select 1 from public.subscription_payments where business_id = (select id from public.businesses where slug = 'lic-mariana-ortiz') and reference = 'Cobro automático Mercado Pago');

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo,
  profession, specialties, extra_categories, years_exp, license, education, languages, attends, consult_price, response_time, directions, urgent24, warranty, payment_info, logo_url, cover_url)
select 'Ortiz Salinas Abogados', 'ortiz-salinas-abogados', 'Despacho · empresas y fiscal', 'Constitución de sociedades, contratos, defensa fiscal y laboral para empresas. Igualas mensuales para PyMEs.',
  (select id from public.categories where slug = 'abogados'),
  (select id from public.zones where slug = 'centro-sur'),
  '5214420000102', '5214420000102', 'Blvd. Bernardo Quintana 450, piso 7',
  extensions.st_setsrid(extensions.st_makepoint(-100.3265, 20.6041), 4326)::extensions.geography,
  true, true, false, 'premium', 'activo', true, null,
  'Despacho de abogados', array['Mercantil y corporativo', 'Fiscal', 'Laboral', 'Contabilidad de empresas']::text[], array['contadores']::text[], 18, '6 abogados con cédula verificada', 'Socios egresados de la Escuela Libre de Derecho y el ITAM', array['Español', 'Inglés']::text[], array['despacho', 'en_linea']::text[], 1200, 'Responde el mismo día', null, false, null, null, null, null
where not exists (select 1 from public.businesses where slug = 'ortiz-salinas-abogados');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'ortiz-salinas-abogados'), 'reservar') on conflict do nothing;
insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'ortiz-salinas-abogados'), 'cotizar') on conflict do nothing;
insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'ortiz-salinas-abogados'), 'consulta') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'ortiz-salinas-abogados'), 1, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'ortiz-salinas-abogados'), 2, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'ortiz-salinas-abogados'), 3, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'ortiz-salinas-abogados'), 4, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'ortiz-salinas-abogados'), 5, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'ortiz-salinas-abogados'), 6, '09:00', '19:00') on conflict do nothing;
insert into public.staff (business_id, name) select (select id from public.businesses where slug = 'ortiz-salinas-abogados'), 'Lic. Salinas' where not exists (select 1 from public.staff where business_id = (select id from public.businesses where slug = 'ortiz-salinas-abogados') and name = 'Lic. Salinas');
insert into public.staff (business_id, name) select (select id from public.businesses where slug = 'ortiz-salinas-abogados'), 'Lic. Ortega' where not exists (select 1 from public.staff where business_id = (select id from public.businesses where slug = 'ortiz-salinas-abogados') and name = 'Lic. Ortega');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'ortiz-salinas-abogados'), 'cita', 'Consulta empresarial', '45 min con un socio', 'Consultas', 1200, 45, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'ortiz-salinas-abogados') and name = 'Consulta empresarial');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'ortiz-salinas-abogados'), 'cotizacion', 'Constitución de sociedad', 'S.A. de C.V. o S.A.S.', 'Corporativo', null, null, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'ortiz-salinas-abogados') and name = 'Constitución de sociedad');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'ortiz-salinas-abogados'), 'cotizacion', 'Revisión de contrato', null, 'Corporativo', null, null, true, 2 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'ortiz-salinas-abogados') and name = 'Revisión de contrato');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'ortiz-salinas-abogados'), 'cotizacion', 'Defensa de crédito fiscal', null, 'Fiscal', null, null, true, 3 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'ortiz-salinas-abogados') and name = 'Defensa de crédito fiscal');
insert into public.reviews (business_id, author_name, rating, body, reply, created_at) select (select id from public.businesses where slug = 'ortiz-salinas-abogados'), 'Luis T.', 5, 'Constituimos la empresa en tiempo récord y sin sorpresas en el costo.', null, now() - interval '1 weeks' where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'ortiz-salinas-abogados') and author_name = 'Luis T.' and body = 'Constituimos la empresa en tiempo récord y sin sorpresas en el costo.');
update public.businesses set rating_avg = 4.8, rating_count = 67, verified = true where slug = 'ortiz-salinas-abogados';
update public.businesses set plan = 'premium', paid_plan = 'premium', paid_until = current_date + 3, plan_status = public.billing_status('premium', current_date + 3), hidden_unpaid = public.billing_status('premium', current_date + 3) = 'suspendido' where slug = 'ortiz-salinas-abogados';
insert into public.subscription_payments (business_id, plan, months, amount, method, reference, status, period_end, created_at, created_by) select (select id from public.businesses where slug = 'ortiz-salinas-abogados'), 'premium', 1, 399, 'transferencia', 'SPEI 7337', 'pagado', current_date + 3, now() - interval '694 hours', null where not exists (select 1 from public.subscription_payments where business_id = (select id from public.businesses where slug = 'ortiz-salinas-abogados') and reference = 'SPEI 7337');

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo,
  profession, specialties, extra_categories, years_exp, license, education, languages, attends, consult_price, response_time, directions, urgent24, warranty, payment_info, logo_url, cover_url)
select 'Lic. Roberto Campos', 'lic-roberto-campos', 'Abogado · laboral', 'Despidos injustificados, finiquitos, demandas y conciliación laboral. Reviso tu caso sin costo y solo cobro si recuperas.',
  (select id from public.categories where slug = 'abogados'),
  (select id from public.zones where slug = 'centro-historico'),
  '5214420000103', '5214420000103', 'Calle Madero 33, despacho 2',
  extensions.st_setsrid(extensions.st_makepoint(-100.3318, 20.6008), 4326)::extensions.geography,
  true, true, false, 'premium', 'activo', true, null,
  'Abogado', array['Laboral']::text[], '{}'::text[], 9, 'Cédula 9120334', 'Licenciatura en Derecho, UNAM', array['Español']::text[], array['despacho', 'en_linea']::text[], 0, 'Responde en menos de 1 h', null, false, null, null, null, null
where not exists (select 1 from public.businesses where slug = 'lic-roberto-campos');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'lic-roberto-campos'), 'reservar') on conflict do nothing;
insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'lic-roberto-campos'), 'cotizar') on conflict do nothing;
insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'lic-roberto-campos'), 'consulta') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'lic-roberto-campos'), 1, '09:00', '18:30') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'lic-roberto-campos'), 2, '09:00', '18:30') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'lic-roberto-campos'), 3, '09:00', '18:30') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'lic-roberto-campos'), 4, '09:00', '18:30') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'lic-roberto-campos'), 5, '09:00', '18:30') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'lic-roberto-campos'), 6, '09:00', '18:30') on conflict do nothing;
insert into public.staff (business_id, name) select (select id from public.businesses where slug = 'lic-roberto-campos'), 'Lic. Campos' where not exists (select 1 from public.staff where business_id = (select id from public.businesses where slug = 'lic-roberto-campos') and name = 'Lic. Campos');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'lic-roberto-campos'), 'cita', 'Revisión de caso', 'Trae tu contrato y recibos', null, 0, 30, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'lic-roberto-campos') and name = 'Revisión de caso');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'lic-roberto-campos'), 'cotizacion', 'Demanda por despido', 'Honorarios sobre lo recuperado', null, null, null, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'lic-roberto-campos') and name = 'Demanda por despido');
insert into public.reviews (business_id, author_name, rating, body, reply, created_at) select (select id from public.businesses where slug = 'lic-roberto-campos'), 'Jorge V.', 5, 'Recuperé mi finiquito completo. Siempre me tuvo al tanto.', null, now() - interval '3 weeks' where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'lic-roberto-campos') and author_name = 'Jorge V.' and body = 'Recuperé mi finiquito completo. Siempre me tuvo al tanto.');
update public.businesses set rating_avg = 4.7, rating_count = 58, verified = true where slug = 'lic-roberto-campos';
update public.businesses set plan = 'premium', paid_plan = 'premium', paid_until = current_date + -4, plan_status = public.billing_status('premium', current_date + -4), hidden_unpaid = public.billing_status('premium', current_date + -4) = 'suspendido' where slug = 'lic-roberto-campos';
insert into public.subscription_payments (business_id, plan, months, amount, method, reference, status, period_end, created_at, created_by) select (select id from public.businesses where slug = 'lic-roberto-campos'), 'premium', 3, 1197, 'transferencia', 'SPEI 9102', 'pendiente', null, now() - interval '4 hours', null where not exists (select 1 from public.subscription_payments where business_id = (select id from public.businesses where slug = 'lic-roberto-campos') and reference = 'SPEI 9102');
insert into public.subscription_payments (business_id, plan, months, amount, method, reference, status, period_end, created_at, created_by) select (select id from public.businesses where slug = 'lic-roberto-campos'), 'premium', 1, 399, 'deposito', 'SPEI 7374', 'pagado', current_date + -4, now() - interval '862 hours', null where not exists (select 1 from public.subscription_payments where business_id = (select id from public.businesses where slug = 'lic-roberto-campos') and reference = 'SPEI 7374');

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo,
  profession, specialties, extra_categories, years_exp, license, education, languages, attends, consult_price, response_time, directions, urgent24, warranty, payment_info, logo_url, cover_url)
select 'Lic. Daniela Treviño', 'lic-daniela-trevino', 'Abogada · migratorio y penal', 'Residencias, regularización migratoria, naturalización y defensa penal. Atiendo en tres idiomas.',
  (select id from public.categories where slug = 'abogados'),
  (select id from public.zones where slug = 'juriquilla'),
  '5214420000104', '5214420000104', 'Atención en línea',
  extensions.st_setsrid(extensions.st_makepoint(-100.3335, 20.5985), 4326)::extensions.geography,
  true, true, false, 'premium', 'activo', true, null,
  'Abogada', array['Migratorio', 'Penal']::text[], '{}'::text[], 7, 'Cédula 10233871', 'Licenciatura en Derecho, Tec de Monterrey', array['Español', 'Inglés', 'Francés']::text[], array['en_linea', 'despacho']::text[], 600, 'Responde en menos de 3 h', null, false, null, null, null, null
where not exists (select 1 from public.businesses where slug = 'lic-daniela-trevino');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'lic-daniela-trevino'), 'reservar') on conflict do nothing;
insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'lic-daniela-trevino'), 'cotizar') on conflict do nothing;
insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'lic-daniela-trevino'), 'consulta') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'lic-daniela-trevino'), 1, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'lic-daniela-trevino'), 2, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'lic-daniela-trevino'), 3, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'lic-daniela-trevino'), 4, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'lic-daniela-trevino'), 5, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'lic-daniela-trevino'), 6, '09:00', '20:00') on conflict do nothing;
insert into public.staff (business_id, name) select (select id from public.businesses where slug = 'lic-daniela-trevino'), 'Lic. Treviño' where not exists (select 1 from public.staff where business_id = (select id from public.businesses where slug = 'lic-daniela-trevino') and name = 'Lic. Treviño');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'lic-daniela-trevino'), 'cita', 'Consulta migratoria', 'Videollamada', null, 600, 40, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'lic-daniela-trevino') and name = 'Consulta migratoria');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'lic-daniela-trevino'), 'cotizacion', 'Residencia temporal o permanente', null, null, null, null, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'lic-daniela-trevino') and name = 'Residencia temporal o permanente');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'lic-daniela-trevino'), 'cotizacion', 'Defensa penal', null, null, null, null, true, 2 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'lic-daniela-trevino') and name = 'Defensa penal');
insert into public.reviews (business_id, author_name, rating, body, reply, created_at) select (select id from public.businesses where slug = 'lic-daniela-trevino'), 'Michael B.', 5, 'Got my permanent residency without a single trip back to the office. Excelente.', null, now() - interval '2 weeks' where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'lic-daniela-trevino') and author_name = 'Michael B.' and body = 'Got my permanent residency without a single trip back to the office. Excelente.');
update public.businesses set rating_avg = 4.9, rating_count = 33, verified = true where slug = 'lic-daniela-trevino';
update public.businesses set plan = 'estandar', paid_plan = 'estandar', paid_until = current_date + 21, plan_status = public.billing_status('estandar', current_date + 21), hidden_unpaid = public.billing_status('estandar', current_date + 21) = 'suspendido' where slug = 'lic-daniela-trevino';

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo,
  profession, specialties, extra_categories, years_exp, license, education, languages, attends, consult_price, response_time, directions, urgent24, warranty, payment_info, logo_url, cover_url)
select 'Despacho Contable Reyes', 'despacho-contable-reyes', 'Contadores · personas y empresas', 'Contabilidad mensual, declaraciones, nómina y defensa ante el SAT para personas físicas, RESICO y PyMEs.',
  (select id from public.categories where slug = 'contadores'),
  (select id from public.zones where slug = 'queretaro-centro'),
  '5214420000105', '5214420000105', 'Av. Zaragoza 120, piso 3',
  extensions.st_setsrid(extensions.st_makepoint(-100.3301, 20.6022), 4326)::extensions.geography,
  true, true, false, 'premium', 'activo', true, null,
  'Contadores públicos', array['Declaración anual', 'Contabilidad de empresas', 'Defensa ante el SAT', 'Nómina e IMSS', 'Finanzas para PyME']::text[], array['consultoria']::text[], 15, 'C.P.C. Héctor Reyes · Cédula 4410982', 'Contaduría Pública, UAQ · Certificación IMCP', array['Español']::text[], array['despacho', 'en_linea']::text[], 0, 'Responde el mismo día', 'Edificio gris de 4 pisos, piso 3. Entrada por Zaragoza, a media cuadra del jardín.', false, null, null, null, null
where not exists (select 1 from public.businesses where slug = 'despacho-contable-reyes');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'despacho-contable-reyes'), 'reservar') on conflict do nothing;
insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'despacho-contable-reyes'), 'cotizar') on conflict do nothing;
insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'despacho-contable-reyes'), 'consulta') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'despacho-contable-reyes'), 1, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'despacho-contable-reyes'), 2, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'despacho-contable-reyes'), 3, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'despacho-contable-reyes'), 4, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'despacho-contable-reyes'), 5, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'despacho-contable-reyes'), 6, '09:00', '19:00') on conflict do nothing;
insert into public.staff (business_id, name) select (select id from public.businesses where slug = 'despacho-contable-reyes'), 'C.P. Héctor Reyes' where not exists (select 1 from public.staff where business_id = (select id from public.businesses where slug = 'despacho-contable-reyes') and name = 'C.P. Héctor Reyes');
insert into public.staff (business_id, name) select (select id from public.businesses where slug = 'despacho-contable-reyes'), 'C.P. Sofía Reyes' where not exists (select 1 from public.staff where business_id = (select id from public.businesses where slug = 'despacho-contable-reyes') and name = 'C.P. Sofía Reyes');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'despacho-contable-reyes'), 'cita', 'Asesoría fiscal', 'En despacho o videollamada', null, 0, 30, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'despacho-contable-reyes') and name = 'Asesoría fiscal');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'despacho-contable-reyes'), 'cotizacion', 'Declaración anual persona física', 'Desde $1,200', null, null, null, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'despacho-contable-reyes') and name = 'Declaración anual persona física');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'despacho-contable-reyes'), 'cotizacion', 'Contabilidad mensual PyME', 'Desde $3,500 al mes', null, null, null, true, 2 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'despacho-contable-reyes') and name = 'Contabilidad mensual PyME');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'despacho-contable-reyes'), 'cotizacion', 'Respuesta a requerimiento del SAT', null, null, null, null, true, 3 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'despacho-contable-reyes') and name = 'Respuesta a requerimiento del SAT');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'despacho-contable-reyes'), 'producto', 'Declaración anual persona física', 'Sueldos, honorarios o arrendamiento', 'Paquetes', 1200, null, true, 4 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'despacho-contable-reyes') and name = 'Declaración anual persona física');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'despacho-contable-reyes'), 'producto', 'Declaración mensual RESICO', 'Incluye revisión de facturas', 'Paquetes', 650, null, true, 5 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'despacho-contable-reyes') and name = 'Declaración mensual RESICO');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'despacho-contable-reyes'), 'producto', 'Alta en el SAT y e.firma', 'Te acompañamos a la cita', 'Trámites', 900, null, true, 6 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'despacho-contable-reyes') and name = 'Alta en el SAT y e.firma');
insert into public.business_photos (business_id, url, caption, color, position) select (select id from public.businesses where slug = 'despacho-contable-reyes'), null, 'Despacho', '#DDF1EA', 0 where not exists (select 1 from public.business_photos where business_id = (select id from public.businesses where slug = 'despacho-contable-reyes') and caption = 'Despacho');
insert into public.business_photos (business_id, url, caption, color, position) select (select id from public.businesses where slug = 'despacho-contable-reyes'), null, 'Área de atención', '#E1E8F4', 1 where not exists (select 1 from public.business_photos where business_id = (select id from public.businesses where slug = 'despacho-contable-reyes') and caption = 'Área de atención');
insert into public.loyalty_programs (business_id, kind, goal, percent, reward) select (select id from public.businesses where slug = 'despacho-contable-reyes'), 'sellos', 12, null, 'Un mes de contabilidad gratis' where not exists (select 1 from public.loyalty_programs where business_id = (select id from public.businesses where slug = 'despacho-contable-reyes'));
insert into public.reviews (business_id, author_name, rating, body, reply, created_at) select (select id from public.businesses where slug = 'despacho-contable-reyes'), 'Rodrigo M.', 5, 'Me sacaron de un requerimiento del SAT en una semana. Muy claros con los costos.', null, now() - interval '2 days' where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'despacho-contable-reyes') and author_name = 'Rodrigo M.' and body = 'Me sacaron de un requerimiento del SAT en una semana. Muy claros con los costos.');
insert into public.reviews (business_id, author_name, rating, body, reply, created_at) select (select id from public.businesses where slug = 'despacho-contable-reyes'), 'Lucía P.', 5, 'Mi declaración anual quedó en un día y con saldo a favor.', null, now() - interval '1 weeks' where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'despacho-contable-reyes') and author_name = 'Lucía P.' and body = 'Mi declaración anual quedó en un día y con saldo a favor.');
update public.businesses set rating_avg = 4.9, rating_count = 132, verified = true where slug = 'despacho-contable-reyes';
update public.businesses set plan = 'premium', paid_plan = 'premium', paid_until = current_date + 17, plan_status = public.billing_status('premium', current_date + 17), hidden_unpaid = public.billing_status('premium', current_date + 17) = 'suspendido' where slug = 'despacho-contable-reyes';
insert into public.subscription_payments (business_id, plan, months, amount, method, reference, status, period_end, created_at, created_by) select (select id from public.businesses where slug = 'despacho-contable-reyes'), 'premium', 1, 399, 'deposito', 'SPEI 7448', 'pagado', current_date + 17, now() - interval '358 hours', null where not exists (select 1 from public.subscription_payments where business_id = (select id from public.businesses where slug = 'despacho-contable-reyes') and reference = 'SPEI 7448');

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo,
  profession, specialties, extra_categories, years_exp, license, education, languages, attends, consult_price, response_time, directions, urgent24, warranty, payment_info, logo_url, cover_url)
select 'C.P. Laura Méndez', 'cp-laura-mendez', 'Contadora · freelancers y RESICO', 'Declaraciones para freelancers, creadores de contenido y pequeños negocios. Todo en línea, sin papeles.',
  (select id from public.categories where slug = 'contadores'),
  (select id from public.zones where slug = 'juriquilla'),
  '5214420000106', '5214420000106', 'Atención en línea',
  extensions.st_setsrid(extensions.st_makepoint(-100.3302, 20.5979), 4326)::extensions.geography,
  true, true, false, 'premium', 'activo', true, null,
  'Contadora', array['RESICO y personas físicas', 'Declaración anual', 'Facturación']::text[], '{}'::text[], 6, 'Cédula 11092376', 'Contaduría, UVM', array['Español']::text[], array['en_linea']::text[], 350, 'Responde en menos de 1 h', null, false, null, null, null, null
where not exists (select 1 from public.businesses where slug = 'cp-laura-mendez');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'cp-laura-mendez'), 'reservar') on conflict do nothing;
insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'cp-laura-mendez'), 'cotizar') on conflict do nothing;
insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'cp-laura-mendez'), 'consulta') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'cp-laura-mendez'), 1, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'cp-laura-mendez'), 2, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'cp-laura-mendez'), 3, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'cp-laura-mendez'), 4, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'cp-laura-mendez'), 5, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'cp-laura-mendez'), 6, '09:00', '20:00') on conflict do nothing;
insert into public.staff (business_id, name) select (select id from public.businesses where slug = 'cp-laura-mendez'), 'C.P. Méndez' where not exists (select 1 from public.staff where business_id = (select id from public.businesses where slug = 'cp-laura-mendez') and name = 'C.P. Méndez');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'cp-laura-mendez'), 'cita', 'Videollamada de dudas', null, null, 350, 30, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'cp-laura-mendez') and name = 'Videollamada de dudas');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'cp-laura-mendez'), 'cotizacion', 'Plan freelancer mensual', 'Desde $590 al mes', null, null, null, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'cp-laura-mendez') and name = 'Plan freelancer mensual');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'cp-laura-mendez'), 'producto', 'Plan freelancer mensual', 'Declaración y facturación ilimitada', 'Paquetes', 590, null, true, 2 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'cp-laura-mendez') and name = 'Plan freelancer mensual');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'cp-laura-mendez'), 'producto', 'Declaración anual', 'Persona física', 'Paquetes', 950, null, true, 3 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'cp-laura-mendez') and name = 'Declaración anual');
insert into public.reviews (business_id, author_name, rating, body, reply, created_at) select (select id from public.businesses where slug = 'cp-laura-mendez'), 'Claudia R.', 5, 'Por fin entiendo mis impuestos. Responde rapidísimo.', null, now() - interval '1 weeks' where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'cp-laura-mendez') and author_name = 'Claudia R.' and body = 'Por fin entiendo mis impuestos. Responde rapidísimo.');
update public.businesses set rating_avg = 4.8, rating_count = 94, verified = true where slug = 'cp-laura-mendez';
update public.businesses set plan = 'vip', paid_plan = 'vip', paid_until = current_date + 9, plan_status = public.billing_status('vip', current_date + 9), hidden_unpaid = public.billing_status('vip', current_date + 9) = 'suspendido' where slug = 'cp-laura-mendez';
update public.businesses set mp_status = 'activo', mp_plan = 'vip' where slug = 'cp-laura-mendez';
insert into public.subscription_payments (business_id, plan, months, amount, method, reference, status, period_end, created_at, created_by) select (select id from public.businesses where slug = 'cp-laura-mendez'), 'vip', 1, 799, 'mercadopago', 'Cobro automático Mercado Pago', 'pagado', current_date + 9, now() - interval '550 hours', null where not exists (select 1 from public.subscription_payments where business_id = (select id from public.businesses where slug = 'cp-laura-mendez') and reference = 'Cobro automático Mercado Pago');

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo,
  profession, specialties, extra_categories, years_exp, license, education, languages, attends, consult_price, response_time, directions, urgent24, warranty, payment_info, logo_url, cover_url)
select 'Notaría Pública 14', 'notaria-publica-14', 'Notaría · escrituras y testamentos', 'Escrituras, testamentos, poderes y actas constitutivas. Cotización por escrito en 24 horas.',
  (select id from public.categories where slug = 'notarias-y-tramites'),
  (select id from public.zones where slug = 'centro-sur'),
  '5214420000107', '5214420000107', 'Av. Universidad 280',
  extensions.st_setsrid(extensions.st_makepoint(-100.3342, 20.6031), 4326)::extensions.geography,
  true, true, false, 'premium', 'activo', true, null,
  'Notaría', array['Escrituras', 'Testamentos', 'Poderes notariales']::text[], '{}'::text[], 25, 'Lic. Andrade · Notario titular', null, array['Español']::text[], array['despacho']::text[], 0, 'Cotiza en 24 h', 'Casona amarilla frente a la Facultad de Derecho. Estacionamiento en la parte trasera.', false, null, null, null, null
where not exists (select 1 from public.businesses where slug = 'notaria-publica-14');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'notaria-publica-14'), 'reservar') on conflict do nothing;
insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'notaria-publica-14'), 'cotizar') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'notaria-publica-14'), 1, '09:00', '17:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'notaria-publica-14'), 2, '09:00', '17:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'notaria-publica-14'), 3, '09:00', '17:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'notaria-publica-14'), 4, '09:00', '17:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'notaria-publica-14'), 5, '09:00', '17:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'notaria-publica-14'), 6, '09:00', '17:00') on conflict do nothing;
insert into public.staff (business_id, name) select (select id from public.businesses where slug = 'notaria-publica-14'), 'Lic. Andrade' where not exists (select 1 from public.staff where business_id = (select id from public.businesses where slug = 'notaria-publica-14') and name = 'Lic. Andrade');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'notaria-publica-14'), 'cita', 'Asesoría notarial', null, null, 0, 30, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'notaria-publica-14') and name = 'Asesoría notarial');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'notaria-publica-14'), 'cotizacion', 'Escritura de compraventa', 'Según valor del inmueble', null, null, null, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'notaria-publica-14') and name = 'Escritura de compraventa');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'notaria-publica-14'), 'cotizacion', 'Testamento', null, null, null, null, true, 2 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'notaria-publica-14') and name = 'Testamento');
insert into public.reviews (business_id, author_name, rating, body, reply, created_at) select (select id from public.businesses where slug = 'notaria-publica-14'), 'Marta L.', 5, 'Todo listo en la fecha prometida. Excelente trato.', null, now() - interval '2 weeks' where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'notaria-publica-14') and author_name = 'Marta L.' and body = 'Todo listo en la fecha prometida. Excelente trato.');
update public.businesses set rating_avg = 4.6, rating_count = 112, verified = true where slug = 'notaria-publica-14';
update public.businesses set plan = 'premium', paid_plan = 'premium', paid_until = current_date + -12, plan_status = public.billing_status('premium', current_date + -12), hidden_unpaid = public.billing_status('premium', current_date + -12) = 'suspendido' where slug = 'notaria-publica-14';
insert into public.subscription_payments (business_id, plan, months, amount, method, reference, status, period_end, created_at, created_by) select (select id from public.businesses where slug = 'notaria-publica-14'), 'premium', 1, 399, 'deposito', 'SPEI 7522', 'pagado', current_date + -12, now() - interval '1054 hours', null where not exists (select 1 from public.subscription_payments where business_id = (select id from public.businesses where slug = 'notaria-publica-14') and reference = 'SPEI 7522');

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo,
  profession, specialties, extra_categories, years_exp, license, education, languages, attends, consult_price, response_time, directions, urgent24, warranty, payment_info, logo_url, cover_url)
select 'Traducciones Peritas Morales', 'traducciones-peritas-morales', 'Perito traductor · inglés y francés', 'Traducciones certificadas de actas, títulos, contratos y expedientes para juicios o trámites migratorios.',
  (select id from public.categories where slug = 'notarias-y-tramites'),
  (select id from public.zones where slug = 'centro-historico'),
  '5214420000108', '5214420000108', 'Calle Hidalgo 77',
  extensions.st_setsrid(extensions.st_makepoint(-100.3312, 20.6058), 4326)::extensions.geography,
  true, true, false, 'premium', 'activo', true, null,
  'Perito traductor', array['Traducción certificada']::text[], '{}'::text[], 11, 'Perito autorizado por el Tribunal Superior de Justicia', null, array['Español', 'Inglés', 'Francés']::text[], array['despacho', 'en_linea']::text[], null, 'Entrega en 48 h', null, false, null, null, null, null
where not exists (select 1 from public.businesses where slug = 'traducciones-peritas-morales');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'traducciones-peritas-morales'), 'cotizar') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'traducciones-peritas-morales'), 1, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'traducciones-peritas-morales'), 2, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'traducciones-peritas-morales'), 3, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'traducciones-peritas-morales'), 4, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'traducciones-peritas-morales'), 5, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'traducciones-peritas-morales'), 6, '09:00', '19:00') on conflict do nothing;
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'traducciones-peritas-morales'), 'cotizacion', 'Acta de nacimiento', 'Desde $450 · 48 h', null, null, null, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'traducciones-peritas-morales') and name = 'Acta de nacimiento');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'traducciones-peritas-morales'), 'cotizacion', 'Contrato o expediente', 'Precio por cuartilla', null, null, null, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'traducciones-peritas-morales') and name = 'Contrato o expediente');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'traducciones-peritas-morales'), 'producto', 'Acta de nacimiento', 'Inglés o francés · 48 h', 'Certificadas', 450, null, true, 2 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'traducciones-peritas-morales') and name = 'Acta de nacimiento');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'traducciones-peritas-morales'), 'producto', 'Título profesional', null, 'Certificadas', 650, null, true, 3 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'traducciones-peritas-morales') and name = 'Título profesional');
insert into public.reviews (business_id, author_name, rating, body, reply, created_at) select (select id from public.businesses where slug = 'traducciones-peritas-morales'), 'Lic. Mariana Ortiz', 5, 'Mi perito de confianza para juicios. Siempre a tiempo.', null, now() - interval '5 days' where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'traducciones-peritas-morales') and author_name = 'Lic. Mariana Ortiz' and body = 'Mi perito de confianza para juicios. Siempre a tiempo.');
update public.businesses set rating_avg = 4.9, rating_count = 49, verified = true where slug = 'traducciones-peritas-morales';
update public.businesses set plan = 'estandar', paid_plan = 'estandar', paid_until = current_date + 22, plan_status = public.billing_status('estandar', current_date + 22), hidden_unpaid = public.billing_status('estandar', current_date + 22) = 'suspendido' where slug = 'traducciones-peritas-morales';
insert into public.subscription_payments (business_id, plan, months, amount, method, reference, status, period_end, created_at, created_by) select (select id from public.businesses where slug = 'traducciones-peritas-morales'), 'estandar', 1, 199, 'transferencia', 'SPEI 7559', 'pagado', current_date + 22, now() - interval '238 hours', null where not exists (select 1 from public.subscription_payments where business_id = (select id from public.businesses where slug = 'traducciones-peritas-morales') and reference = 'SPEI 7559');

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo,
  profession, specialties, extra_categories, years_exp, license, education, languages, attends, consult_price, response_time, directions, urgent24, warranty, payment_info, logo_url, cover_url)
select 'Psic. Andrea Vidal', 'psic-andrea-vidal', 'Psicóloga · adultos y parejas', 'Terapia individual y de pareja, presencial o en línea. Enfoque cognitivo conductual.',
  (select id from public.categories where slug = 'psicologia-y-salud'),
  (select id from public.zones where slug = 'juriquilla'),
  '5214420000109', '5214420000109', 'Calle Jazmín 41, consultorio 2',
  extensions.st_setsrid(extensions.st_makepoint(-100.3355, 20.5995), 4326)::extensions.geography,
  true, true, false, 'premium', 'activo', true, null,
  'Psicóloga', array['Terapia individual', 'Terapia de pareja', 'Ansiedad y estrés']::text[], '{}'::text[], 10, 'Cédula 8031457', 'Maestría en Psicoterapia Cognitivo Conductual', array['Español', 'Inglés']::text[], array['despacho', 'en_linea']::text[], 700, 'Responde en menos de 4 h', 'Consultorio 2, planta baja. Timbre con el nombre "Vidal".', false, null, null, null, null
where not exists (select 1 from public.businesses where slug = 'psic-andrea-vidal');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'psic-andrea-vidal'), 'reservar') on conflict do nothing;
insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'psic-andrea-vidal'), 'consulta') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'psic-andrea-vidal'), 1, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'psic-andrea-vidal'), 2, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'psic-andrea-vidal'), 3, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'psic-andrea-vidal'), 4, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'psic-andrea-vidal'), 5, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'psic-andrea-vidal'), 6, '09:00', '20:00') on conflict do nothing;
insert into public.staff (business_id, name) select (select id from public.businesses where slug = 'psic-andrea-vidal'), 'Psic. Vidal' where not exists (select 1 from public.staff where business_id = (select id from public.businesses where slug = 'psic-andrea-vidal') and name = 'Psic. Vidal');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'psic-andrea-vidal'), 'cita', 'Sesión individual', 'Presencial o en línea', null, 700, 50, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'psic-andrea-vidal') and name = 'Sesión individual');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'psic-andrea-vidal'), 'cita', 'Sesión de pareja', null, null, 950, 60, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'psic-andrea-vidal') and name = 'Sesión de pareja');
insert into public.business_photos (business_id, url, caption, color, position) select (select id from public.businesses where slug = 'psic-andrea-vidal'), null, 'Consultorio', '#F8E1EB', 0 where not exists (select 1 from public.business_photos where business_id = (select id from public.businesses where slug = 'psic-andrea-vidal') and caption = 'Consultorio');
insert into public.reviews (business_id, author_name, rating, body, reply, created_at) select (select id from public.businesses where slug = 'psic-andrea-vidal'), 'Usuario verificado', 5, 'Me sentí escuchado desde la primera sesión.', null, now() - interval '1 weeks' where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'psic-andrea-vidal') and author_name = 'Usuario verificado' and body = 'Me sentí escuchado desde la primera sesión.');
update public.businesses set rating_avg = 4.9, rating_count = 87, verified = true where slug = 'psic-andrea-vidal';
update public.businesses set plan = 'premium', paid_plan = 'premium', paid_until = current_date + 2, plan_status = public.billing_status('premium', current_date + 2), hidden_unpaid = public.billing_status('premium', current_date + 2) = 'suspendido' where slug = 'psic-andrea-vidal';
insert into public.subscription_payments (business_id, plan, months, amount, method, reference, status, period_end, created_at, created_by) select (select id from public.businesses where slug = 'psic-andrea-vidal'), 'premium', 1, 399, 'deposito', 'SPEI 7596', 'pagado', current_date + 2, now() - interval '718 hours', null where not exists (select 1 from public.subscription_payments where business_id = (select id from public.businesses where slug = 'psic-andrea-vidal') and reference = 'SPEI 7596');

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo,
  profession, specialties, extra_categories, years_exp, license, education, languages, attends, consult_price, response_time, directions, urgent24, warranty, payment_info, logo_url, cover_url)
select 'Arq. Diego Fuentes', 'arq-diego-fuentes', 'Arquitecto · proyectos y licencias', 'Planos, remodelaciones, licencias de construcción y dirección de obra. La visita de levantamiento se descuenta del proyecto.',
  (select id from public.categories where slug = 'arquitectura'),
  (select id from public.zones where slug = 'el-marques'),
  '5214420000110', '5214420000110', 'Av. Industrial 102',
  extensions.st_setsrid(extensions.st_makepoint(-100.3235, 20.6015), 4326)::extensions.geography,
  false, true, true, 'premium', 'activo', true, null,
  'Arquitecto', array['Proyecto arquitectónico', 'Licencias de construcción', 'Remodelación']::text[], '{}'::text[], 14, 'Cédula 5520981 · DRO registrado', 'Arquitectura, UAQ', array['Español']::text[], array['domicilio', 'despacho']::text[], 800, 'Responde en menos de 1 día', null, false, null, null, null, null
where not exists (select 1 from public.businesses where slug = 'arq-diego-fuentes');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'arq-diego-fuentes'), 'reservar') on conflict do nothing;
insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'arq-diego-fuentes'), 'cotizar') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'arq-diego-fuentes'), 1, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'arq-diego-fuentes'), 2, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'arq-diego-fuentes'), 3, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'arq-diego-fuentes'), 4, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'arq-diego-fuentes'), 5, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'arq-diego-fuentes'), 6, '09:00', '18:00') on conflict do nothing;
insert into public.staff (business_id, name) select (select id from public.businesses where slug = 'arq-diego-fuentes'), 'Arq. Fuentes' where not exists (select 1 from public.staff where business_id = (select id from public.businesses where slug = 'arq-diego-fuentes') and name = 'Arq. Fuentes');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'arq-diego-fuentes'), 'cita', 'Visita de levantamiento', null, null, 800, 90, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'arq-diego-fuentes') and name = 'Visita de levantamiento');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'arq-diego-fuentes'), 'cotizacion', 'Proyecto de remodelación', 'Planos y presupuesto de obra', null, null, null, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'arq-diego-fuentes') and name = 'Proyecto de remodelación');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'arq-diego-fuentes'), 'cotizacion', 'Licencia de construcción', null, null, null, null, true, 2 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'arq-diego-fuentes') and name = 'Licencia de construcción');
insert into public.business_photos (business_id, url, caption, color, position) select (select id from public.businesses where slug = 'arq-diego-fuentes'), null, 'Remodelación de cocina, Juriquilla', '#E2E7EF', 0 where not exists (select 1 from public.business_photos where business_id = (select id from public.businesses where slug = 'arq-diego-fuentes') and caption = 'Remodelación de cocina, Juriquilla');
insert into public.business_photos (business_id, url, caption, color, position) select (select id from public.businesses where slug = 'arq-diego-fuentes'), null, 'Casa habitación, El Marqués', '#DCE4F2', 1 where not exists (select 1 from public.business_photos where business_id = (select id from public.businesses where slug = 'arq-diego-fuentes') and caption = 'Casa habitación, El Marqués');
insert into public.reviews (business_id, author_name, rating, body, reply, created_at) select (select id from public.businesses where slug = 'arq-diego-fuentes'), 'Jorge V.', 5, 'La licencia salió a la primera, gracias a sus planos.', null, now() - interval '3 weeks' where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'arq-diego-fuentes') and author_name = 'Jorge V.' and body = 'La licencia salió a la primera, gracias a sus planos.');
update public.businesses set rating_avg = 4.7, rating_count = 29, verified = true where slug = 'arq-diego-fuentes';
update public.businesses set plan = 'premium', paid_plan = 'premium', paid_until = current_date + 28, plan_status = public.billing_status('premium', current_date + 28), hidden_unpaid = public.billing_status('premium', current_date + 28) = 'suspendido' where slug = 'arq-diego-fuentes';
update public.businesses set mp_status = 'activo', mp_plan = 'premium' where slug = 'arq-diego-fuentes';
insert into public.subscription_payments (business_id, plan, months, amount, method, reference, status, period_end, created_at, created_by) select (select id from public.businesses where slug = 'arq-diego-fuentes'), 'premium', 1, 399, 'mercadopago', 'Cobro automático Mercado Pago', 'pagado', current_date + 28, now() - interval '94 hours', null where not exists (select 1 from public.subscription_payments where business_id = (select id from public.businesses where slug = 'arq-diego-fuentes') and reference = 'Cobro automático Mercado Pago');

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo,
  profession, specialties, extra_categories, years_exp, license, education, languages, attends, consult_price, response_time, directions, urgent24, warranty, payment_info, logo_url, cover_url)
select 'Patricia Luna', 'patricia-luna-seguros', 'Asesora de seguros · vida y gastos médicos', 'Comparo varias aseguradoras y te explico cada cobertura sin presiones. Revisión de pólizas sin costo.',
  (select id from public.categories where slug = 'consultoria'),
  (select id from public.zones where slug = 'queretaro-centro'),
  '5214420000111', '5214420000111', 'Plaza Zen, local 15',
  extensions.st_setsrid(extensions.st_makepoint(-100.3281, 20.6005), 4326)::extensions.geography,
  true, true, true, 'premium', 'activo', true, null,
  'Asesora de seguros', array['Seguros de gastos médicos', 'Seguros de vida y retiro']::text[], '{}'::text[], 8, 'Cédula CNSF A-120394', null, array['Español']::text[], array['despacho', 'en_linea', 'domicilio']::text[], 0, 'Responde en menos de 1 h', null, false, null, null, null, null
where not exists (select 1 from public.businesses where slug = 'patricia-luna-seguros');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'patricia-luna-seguros'), 'reservar') on conflict do nothing;
insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'patricia-luna-seguros'), 'cotizar') on conflict do nothing;
insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'patricia-luna-seguros'), 'consulta') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'patricia-luna-seguros'), 1, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'patricia-luna-seguros'), 2, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'patricia-luna-seguros'), 3, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'patricia-luna-seguros'), 4, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'patricia-luna-seguros'), 5, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'patricia-luna-seguros'), 6, '09:00', '19:00') on conflict do nothing;
insert into public.staff (business_id, name) select (select id from public.businesses where slug = 'patricia-luna-seguros'), 'Patricia Luna' where not exists (select 1 from public.staff where business_id = (select id from public.businesses where slug = 'patricia-luna-seguros') and name = 'Patricia Luna');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'patricia-luna-seguros'), 'cita', 'Revisión de pólizas', null, null, 0, 40, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'patricia-luna-seguros') and name = 'Revisión de pólizas');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'patricia-luna-seguros'), 'cotizacion', 'Gastos médicos mayores', 'Individual o familiar', null, null, null, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'patricia-luna-seguros') and name = 'Gastos médicos mayores');
insert into public.reviews (business_id, author_name, rating, body, reply, created_at) select (select id from public.businesses where slug = 'patricia-luna-seguros'), 'Laura M.', 5, 'Me explicó cada cobertura sin presiones.', null, now() - interval '2 weeks' where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'patricia-luna-seguros') and author_name = 'Laura M.' and body = 'Me explicó cada cobertura sin presiones.');
update public.businesses set rating_avg = 4.8, rating_count = 53, verified = true where slug = 'patricia-luna-seguros';
update public.businesses set plan = 'estandar', paid_plan = 'estandar', paid_until = current_date + 28, plan_status = public.billing_status('estandar', current_date + 28), hidden_unpaid = public.billing_status('estandar', current_date + 28) = 'suspendido' where slug = 'patricia-luna-seguros';

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo,
  profession, specialties, extra_categories, years_exp, license, education, languages, attends, consult_price, response_time, directions, urgent24, warranty, payment_info, logo_url, cover_url)
select 'Rumbo Consultores', 'rumbo-consultores', 'Consultoría · procesos y finanzas', 'Diagnóstico operativo, mejora de procesos, costos y tableros de indicadores para micro y pequeñas empresas.',
  (select id from public.categories where slug = 'consultoria'),
  (select id from public.zones where slug = 'centro-sur'),
  '5214420000112', '5214420000112', 'Av. Constituyentes 812',
  extensions.st_setsrid(extensions.st_makepoint(-100.3245, 20.5992), 4326)::extensions.geography,
  true, true, true, 'premium', 'activo', true, null,
  'Consultoría para PyMEs', array['Mejora de procesos', 'Finanzas para PyME']::text[], '{}'::text[], 12, null, 'Ingeniería Industrial · Lean Six Sigma Black Belt', array['Español', 'Inglés']::text[], array['domicilio', 'en_linea']::text[], 0, 'Responde el mismo día', null, false, null, null, null, null
where not exists (select 1 from public.businesses where slug = 'rumbo-consultores');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'rumbo-consultores'), 'reservar') on conflict do nothing;
insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'rumbo-consultores'), 'cotizar') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'rumbo-consultores'), 1, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'rumbo-consultores'), 2, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'rumbo-consultores'), 3, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'rumbo-consultores'), 4, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'rumbo-consultores'), 5, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'rumbo-consultores'), 6, '09:00', '19:00') on conflict do nothing;
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'rumbo-consultores'), 'cita', 'Diagnóstico express', '1 hora en tu negocio', null, 0, 60, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'rumbo-consultores') and name = 'Diagnóstico express');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'rumbo-consultores'), 'cotizacion', 'Proyecto de mejora de procesos', '4 a 8 semanas', null, null, null, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'rumbo-consultores') and name = 'Proyecto de mejora de procesos');
insert into public.reviews (business_id, author_name, rating, body, reply, created_at) select (select id from public.businesses where slug = 'rumbo-consultores'), 'Ana G.', 5, 'Bajamos 15% los costos del taller en dos meses.', null, now() - interval '1 months' where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'rumbo-consultores') and author_name = 'Ana G.' and body = 'Bajamos 15% los costos del taller en dos meses.');
update public.businesses set rating_avg = 4.9, rating_count = 38, verified = true where slug = 'rumbo-consultores';
update public.businesses set plan = 'premium', paid_plan = 'premium', paid_until = current_date + -2, plan_status = public.billing_status('premium', current_date + -2), hidden_unpaid = public.billing_status('premium', current_date + -2) = 'suspendido' where slug = 'rumbo-consultores';
insert into public.subscription_payments (business_id, plan, months, amount, method, reference, status, period_end, created_at, created_by) select (select id from public.businesses where slug = 'rumbo-consultores'), 'premium', 1, 399, 'transferencia', 'SPEI 9111', 'pendiente', null, now() - interval '13 hours', null where not exists (select 1 from public.subscription_payments where business_id = (select id from public.businesses where slug = 'rumbo-consultores') and reference = 'SPEI 9111');
insert into public.subscription_payments (business_id, plan, months, amount, method, reference, status, period_end, created_at, created_by) select (select id from public.businesses where slug = 'rumbo-consultores'), 'premium', 1, 399, 'transferencia', 'SPEI 7707', 'pagado', current_date + -2, now() - interval '814 hours', null where not exists (select 1 from public.subscription_payments where business_id = (select id from public.businesses where slug = 'rumbo-consultores') and reference = 'SPEI 7707');

-- Muro de la comunidad
insert into public.posts (business_id, kind, title, body, specialty, price, price_note, likes_count, created_at) select (select id from public.businesses where slug = 'despacho-contable-reyes'), 'servicio', 'Declaración anual de personas físicas', 'Revisamos tus deducciones (médicos, colegiaturas, intereses) para que recuperes tu saldo a favor. Trae tu e.firma o te ayudamos a tramitarla.', 'Declaración anual', 1200, 'precio fijo', 34, now() - interval '2 hours' where not exists (select 1 from public.posts where title = 'Declaración anual de personas físicas');
insert into public.post_comments (post_id, author_name, body) select (select id from public.posts where title = 'Declaración anual de personas físicas'), 'Lucía P.', '¿Incluye si tengo dos patrones?' where not exists (select 1 from public.post_comments pc join public.posts po on po.id = pc.post_id where po.title = 'Declaración anual de personas físicas' and pc.body = '¿Incluye si tengo dos patrones?');
insert into public.post_comments (post_id, author_name, body) select (select id from public.posts where title = 'Declaración anual de personas físicas'), 'Despacho Contable Reyes', 'Sí, Lucía, mismo precio.' where not exists (select 1 from public.post_comments pc join public.posts po on po.id = pc.post_id where po.title = 'Declaración anual de personas físicas' and pc.body = 'Sí, Lucía, mismo precio.');
insert into public.posts (business_id, kind, title, body, specialty, price, price_note, likes_count, created_at) select (select id from public.businesses where slug = 'lic-mariana-ortiz'), 'servicio', 'Divorcio voluntario con convenio', 'Si ambos están de acuerdo, el trámite puede quedar en 6 a 10 semanas. Primera consulta en línea a $350 para revisar tu caso.', 'Familiar', 350, 'primera consulta', 21, now() - interval '1 day' where not exists (select 1 from public.posts where title = 'Divorcio voluntario con convenio');
insert into public.posts (business_id, kind, title, body, specialty, price, price_note, likes_count, created_at) select (select id from public.businesses where slug = 'rumbo-consultores'), 'evento', 'Taller gratuito: precios que sí dejan utilidad', 'Sábado 8 de noviembre, 10:00 h, en línea. Para dueños de negocio que quieren calcular bien sus costos. Cupo de 30 lugares.', 'Finanzas para PyME', null, null, 47, now() - interval '1 day' where not exists (select 1 from public.posts where title = 'Taller gratuito: precios que sí dejan utilidad');
insert into public.post_comments (post_id, author_name, body) select (select id from public.posts where title = 'Taller gratuito: precios que sí dejan utilidad'), 'Ana G.', 'Ya me registré 🙌' where not exists (select 1 from public.post_comments pc join public.posts po on po.id = pc.post_id where po.title = 'Taller gratuito: precios que sí dejan utilidad' and pc.body = 'Ya me registré 🙌');
insert into public.posts (business_id, kind, title, body, specialty, price, price_note, likes_count, created_at) select (select id from public.businesses where slug = 'lic-roberto-campos'), 'consejo', 'Te despidieron: no firmes nada todavía', 'Tienes 2 meses para reclamar. Antes de firmar tu finiquito, revisa que incluya aguinaldo, vacaciones y prima vacacional proporcionales.', 'Laboral', null, null, 112, now() - interval '3 days' where not exists (select 1 from public.posts where title = 'Te despidieron: no firmes nada todavía');
insert into public.post_comments (post_id, author_name, body) select (select id from public.posts where title = 'Te despidieron: no firmes nada todavía'), 'Jorge V.', 'Este consejo me salvó.' where not exists (select 1 from public.post_comments pc join public.posts po on po.id = pc.post_id where po.title = 'Te despidieron: no firmes nada todavía' and pc.body = 'Este consejo me salvó.');
insert into public.posts (business_id, kind, title, body, specialty, price, price_note, likes_count, created_at) select (select id from public.businesses where slug = 'psic-andrea-vidal'), 'consejo', 'Respiración 4-7-8 para bajar la ansiedad', 'Inhala en 4 segundos, sostén 7 y exhala en 8. Repite cuatro veces. Si la ansiedad no cede en semanas, vale la pena pedir ayuda.', 'Ansiedad y estrés', null, null, 76, now() - interval '5 days' where not exists (select 1 from public.posts where title = 'Respiración 4-7-8 para bajar la ansiedad');

-- Preguntas a expertos con sus respuestas
insert into public.questions (category_id, author_name, specialty, body, created_at) select (select id from public.categories where slug = 'abogados'), 'Laura M.', 'Laboral', 'Me ofrecen firmar mi renuncia a cambio de un mes de sueldo. ¿Me conviene o me corresponde más?', now() - interval '3 hours' where not exists (select 1 from public.questions where body = 'Me ofrecen firmar mi renuncia a cambio de un mes de sueldo. ¿Me conviene o me corresponde más?');
insert into public.answers (question_id, business_id, body, helpful_count) select (select id from public.questions where body = 'Me ofrecen firmar mi renuncia a cambio de un mes de sueldo. ¿Me conviene o me corresponde más?'), (select id from public.businesses where slug = 'lic-roberto-campos'), 'Si te están pidiendo renunciar, en realidad es un despido. Te corresponden 3 meses de salario, 20 días por año en algunos casos, más aguinaldo, vacaciones y prima proporcionales. No firmes sin revisar los números.', 24 where not exists (select 1 from public.answers where body = 'Si te están pidiendo renunciar, en realidad es un despido. Te corresponden 3 meses de salario, 20 días por año en algunos casos, más aguinaldo, vacaciones y prima proporcionales. No firmes sin revisar los números.');
insert into public.questions (category_id, author_name, specialty, body, created_at) select (select id from public.categories where slug = 'contadores'), 'Pedro S.', 'Declaración anual', '¿Tengo que presentar declaración anual si solo tuve un trabajo de sueldo?', now() - interval '1 day' where not exists (select 1 from public.questions where body = '¿Tengo que presentar declaración anual si solo tuve un trabajo de sueldo?');
insert into public.answers (question_id, business_id, body, helpful_count) select (select id from public.questions where body = '¿Tengo que presentar declaración anual si solo tuve un trabajo de sueldo?'), (select id from public.businesses where slug = 'despacho-contable-reyes'), 'Si ganaste menos de 400 mil pesos y solo de un patrón, no es obligatoria. Pero si tuviste gastos médicos o colegiaturas, conviene presentarla para recuperar saldo a favor.', 31 where not exists (select 1 from public.answers where body = 'Si ganaste menos de 400 mil pesos y solo de un patrón, no es obligatoria. Pero si tuviste gastos médicos o colegiaturas, conviene presentarla para recuperar saldo a favor.');
insert into public.answers (question_id, business_id, body, helpful_count) select (select id from public.questions where body = '¿Tengo que presentar declaración anual si solo tuve un trabajo de sueldo?'), (select id from public.businesses where slug = 'cp-laura-mendez'), 'Coincido. Revisa también si tu patrón te hizo el ajuste anual; si no, podrías tener saldo a favor.', 9 where not exists (select 1 from public.answers where body = 'Coincido. Revisa también si tu patrón te hizo el ajuste anual; si no, podrías tener saldo a favor.');
insert into public.questions (category_id, author_name, specialty, body, created_at) select (select id from public.categories where slug = 'arquitectura'), 'Usuario 3381', null, '¿Necesito licencia para construir un segundo piso en mi casa?', now() - interval '4 days' where not exists (select 1 from public.questions where body = '¿Necesito licencia para construir un segundo piso en mi casa?');

-- Anuncios al abrir la app
insert into public.opening_ads (business_id, headline, body, cta, color, status) select (select id from public.businesses where slug = 'despacho-contable-reyes'), 'Asesoría fiscal gratis', 'Tu primera consulta sin costo, en despacho o en línea.', 'Agendar cita', '#1F3A68', 'activa' where not exists (select 1 from public.opening_ads where business_id = (select id from public.businesses where slug = 'despacho-contable-reyes') and headline = 'Asesoría fiscal gratis');
insert into public.opening_ads (business_id, headline, body, cta, color, status) select (select id from public.businesses where slug = 'lic-mariana-ortiz'), '10% en tu consulta', 'Derecho familiar con cédula verificada. Agenda desde aquí.', 'Agendar cita', '#6B4FC8', 'activa' where not exists (select 1 from public.opening_ads where business_id = (select id from public.businesses where slug = 'lic-mariana-ortiz') and headline = '10% en tu consulta');
insert into public.opening_ads (business_id, headline, body, cta, color, status) select (select id from public.businesses where slug = 'notaria-publica-14'), 'Mes del testamento', 'Precio preferente todo septiembre. Cotiza en 24 h.', 'Cotizar', '#146B4F', 'activa' where not exists (select 1 from public.opening_ads where business_id = (select id from public.businesses where slug = 'notaria-publica-14') and headline = 'Mes del testamento');
insert into public.opening_ads (business_id, headline, body, cta, color, status) select (select id from public.businesses where slug = 'patricia-luna-seguros'), 'Revisa tus pólizas', 'Te digo en 40 minutos si estás bien protegido.', 'Agendar cita', '#2F80ED', 'activa' where not exists (select 1 from public.opening_ads where business_id = (select id from public.businesses where slug = 'patricia-luna-seguros') and headline = 'Revisa tus pólizas');

