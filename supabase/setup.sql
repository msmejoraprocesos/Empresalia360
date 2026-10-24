-- Expertalia 360 · instalación completa en un proyecto nuevo de Supabase
-- Pega este archivo completo en Supabase → SQL Editor → New query → Run.
-- Generado a partir de supabase/migrations, seed.sql y seed_demo.sql.

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
  plan text not null default 'basico',
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

-- ════════ supabase/seed.sql ════════
-- Datos base: zonas y categorías iniciales (sin negocios de ejemplo)

insert into public.zones (name, municipality, state, slug) values
  ('Zen House', 'El Marqués', 'Querétaro', 'zen-house'),
  ('Residencial del Parque', 'El Marqués', 'Querétaro', 'residencial-del-parque'),
  ('El Mirador', 'El Marqués', 'Querétaro', 'el-mirador'),
  ('Cumbres de Conín', 'El Marqués', 'Querétaro', 'cumbres-de-conin')
on conflict (slug) do nothing;

insert into public.categories (name, slug, color, icon, position) values
  ('Comida', 'comida', '#E04A1F', 'comida', 1),
  ('Café y postres', 'cafe-y-postres', '#FFC93C', 'cafe', 2),
  ('Belleza', 'belleza', '#E8457C', 'belleza', 3),
  ('Salud', 'salud', '#2D7FF9', 'salud', 4),
  ('Profesionales', 'profesionales', '#7B4FE0', 'profesionales', 5),
  ('Autos y talleres', 'autos-y-talleres', '#1F1A17', 'autos', 6),
  ('Hogar y oficios', 'hogar-y-oficios', '#12A06E', 'hogar', 7),
  ('Tiendas', 'tiendas', '#6A5F57', 'tiendas', 8)
on conflict (slug) do nothing;

-- ════════ supabase/seed_demo.sql ════════
-- Negocios de ejemplo (ficticios) para probar la app. Generado por apps/mobile/scripts/generate-demo-seed.ts
-- Para borrarlos: delete from public.businesses where slug in (...);

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo)
select 'Café La Esquina', 'cafe-la-esquina', 'Cafetería · waffles', 'Café de especialidad y waffles belgas hechos al momento. Pet friendly.',
  (select id from public.categories where slug = 'cafe-y-postres'),
  (select id from public.zones where slug = 'zen-house'),
  '5214420000101', '5214420000101', 'Av. Zen 120, local 4',
  extensions.st_setsrid(extensions.st_makepoint(-100.3301, 20.6022), 4326)::extensions.geography,
  true, true, true, 'plata', 'activo', true, '2x1 en waffles de 4 a 6 pm'
where not exists (select 1 from public.businesses where slug = 'cafe-la-esquina');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'cafe-la-esquina'), 'ordenar') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'cafe-la-esquina'), 0, '09:00', '21:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'cafe-la-esquina'), 1, '09:00', '21:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'cafe-la-esquina'), 2, '09:00', '21:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'cafe-la-esquina'), 3, '09:00', '21:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'cafe-la-esquina'), 4, '09:00', '21:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'cafe-la-esquina'), 5, '09:00', '21:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'cafe-la-esquina'), 6, '09:00', '21:00') on conflict do nothing;
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'cafe-la-esquina'), 'producto', 'Americano grande', '16 oz, grano de Veracruz', 'Café', 45, null, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'cafe-la-esquina') and name = 'Americano grande');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'cafe-la-esquina'), 'producto', 'Latte', 'Leche entera o de avena', 'Café', 58, null, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'cafe-la-esquina') and name = 'Latte');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'cafe-la-esquina'), 'producto', 'Waffle de fresa', 'Fresas, crema y miel', 'Waffles', 95, null, true, 2 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'cafe-la-esquina') and name = 'Waffle de fresa');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'cafe-la-esquina'), 'producto', 'Waffle Nutella', 'Nutella y plátano', 'Waffles', 105, null, true, 3 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'cafe-la-esquina') and name = 'Waffle Nutella');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'cafe-la-esquina'), 'producto', 'Limonada natural', '500 ml', 'Bebidas', 40, null, true, 4 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'cafe-la-esquina') and name = 'Limonada natural');
insert into public.loyalty_programs (business_id, kind, goal, percent, reward) select (select id from public.businesses where slug = 'cafe-la-esquina'), 'sellos', 10, null, 'Café americano gratis' where not exists (select 1 from public.loyalty_programs where business_id = (select id from public.businesses where slug = 'cafe-la-esquina'));
insert into public.reviews (business_id, author_name, rating, body, reply) select (select id from public.businesses where slug = 'cafe-la-esquina'), 'Rodrigo M.', 5, 'El waffle de fresa es otro nivel y ya voy en mi sello 6.', '¡Gracias, Rodrigo! Te esperamos por el séptimo.' where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'cafe-la-esquina') and author_name = 'Rodrigo M.' and body = 'El waffle de fresa es otro nivel y ya voy en mi sello 6.');
insert into public.reviews (business_id, author_name, rating, body, reply) select (select id from public.businesses where slug = 'cafe-la-esquina'), 'Lucía P.', 5, 'Lugar acogedor, buen café y precios justos.', null where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'cafe-la-esquina') and author_name = 'Lucía P.' and body = 'Lugar acogedor, buen café y precios justos.');
insert into public.reviews (business_id, author_name, rating, body, reply) select (select id from public.businesses where slug = 'cafe-la-esquina'), 'Javier R.', 4, 'Ricos waffles, en fin de semana tardan un poco.', null where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'cafe-la-esquina') and author_name = 'Javier R.' and body = 'Ricos waffles, en fin de semana tardan un poco.');

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo)
select 'Fonda Doña Lupe', 'fonda-dona-lupe', 'Comida casera', 'Comida corrida, guisos y antojitos. Menú del día de lunes a sábado.',
  (select id from public.categories where slug = 'comida'),
  (select id from public.zones where slug = 'residencial-del-parque'),
  '5214420000102', '5214420000102', 'Calle Bambú 33',
  extensions.st_setsrid(extensions.st_makepoint(-100.3272, 20.5998), 4326)::extensions.geography,
  true, true, true, 'plata', 'activo', true, 'Postre gratis en pedidos desde $250'
where not exists (select 1 from public.businesses where slug = 'fonda-dona-lupe');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'fonda-dona-lupe'), 'ordenar') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'fonda-dona-lupe'), 0, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'fonda-dona-lupe'), 1, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'fonda-dona-lupe'), 2, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'fonda-dona-lupe'), 3, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'fonda-dona-lupe'), 4, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'fonda-dona-lupe'), 5, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'fonda-dona-lupe'), 6, '09:00', '18:00') on conflict do nothing;
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'fonda-dona-lupe'), 'producto', 'Comida corrida', 'Sopa, guisado, arroz, frijoles y agua', 'Menú del día', 110, null, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'fonda-dona-lupe') and name = 'Comida corrida');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'fonda-dona-lupe'), 'producto', 'Enchiladas suizas', 'Pollo, salsa verde cremosa', 'Guisos', 135, null, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'fonda-dona-lupe') and name = 'Enchiladas suizas');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'fonda-dona-lupe'), 'producto', 'Chiles rellenos', 'De queso, con arroz', 'Guisos', 125, null, true, 2 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'fonda-dona-lupe') and name = 'Chiles rellenos');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'fonda-dona-lupe'), 'producto', 'Orden de sopes', '3 piezas', 'Antojitos', 75, null, true, 3 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'fonda-dona-lupe') and name = 'Orden de sopes');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'fonda-dona-lupe'), 'producto', 'Agua de jamaica', '1 litro', 'Bebidas', 35, null, true, 4 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'fonda-dona-lupe') and name = 'Agua de jamaica');
insert into public.loyalty_programs (business_id, kind, goal, percent, reward) select (select id from public.businesses where slug = 'fonda-dona-lupe'), 'sellos', 8, null, 'Comida corrida gratis' where not exists (select 1 from public.loyalty_programs where business_id = (select id from public.businesses where slug = 'fonda-dona-lupe'));
insert into public.reviews (business_id, author_name, rating, body, reply) select (select id from public.businesses where slug = 'fonda-dona-lupe'), 'Ana G.', 5, 'Sabe como en casa, y el pedido llegó caliente.', null where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'fonda-dona-lupe') and author_name = 'Ana G.' and body = 'Sabe como en casa, y el pedido llegó caliente.');
insert into public.reviews (business_id, author_name, rating, body, reply) select (select id from public.businesses where slug = 'fonda-dona-lupe'), 'Pedro S.', 4, 'Muy rico, porciones grandes.', null where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'fonda-dona-lupe') and author_name = 'Pedro S.' and body = 'Muy rico, porciones grandes.');

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo)
select 'Taquería El Güero', 'taqueria-el-guero', 'Tacos · por la noche', 'Tacos al pastor, suadero y campechanos. Abierto de 7 pm a 1 am.',
  (select id from public.categories where slug = 'comida'),
  (select id from public.zones where slug = 'zen-house'),
  '5214420000103', '5214420000103', 'Av. Constituyentes 812',
  extensions.st_setsrid(extensions.st_makepoint(-100.3265, 20.6041), 4326)::extensions.geography,
  false, true, false, 'plata', 'activo', true, null
where not exists (select 1 from public.businesses where slug = 'taqueria-el-guero');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'taqueria-el-guero'), 'ordenar') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'taqueria-el-guero'), 0, '09:00', '01:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'taqueria-el-guero'), 1, '09:00', '01:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'taqueria-el-guero'), 2, '09:00', '01:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'taqueria-el-guero'), 3, '09:00', '01:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'taqueria-el-guero'), 4, '09:00', '01:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'taqueria-el-guero'), 5, '09:00', '01:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'taqueria-el-guero'), 6, '09:00', '01:00') on conflict do nothing;
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'taqueria-el-guero'), 'producto', 'Taco al pastor', null, 'Tacos', 18, null, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'taqueria-el-guero') and name = 'Taco al pastor');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'taqueria-el-guero'), 'producto', 'Taco de suadero', null, 'Tacos', 18, null, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'taqueria-el-guero') and name = 'Taco de suadero');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'taqueria-el-guero'), 'producto', 'Gringa', null, 'Tacos', 55, null, true, 2 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'taqueria-el-guero') and name = 'Gringa');
insert into public.reviews (business_id, author_name, rating, body, reply) select (select id from public.businesses where slug = 'taqueria-el-guero'), 'Luis T.', 5, 'El mejor pastor de la zona.', null where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'taqueria-el-guero') and author_name = 'Luis T.' and body = 'El mejor pastor de la zona.');

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo)
select 'Barbería El Bigote', 'barberia-el-bigote', 'Barbería', 'Cortes clásicos y modernos, barba con toalla caliente.',
  (select id from public.categories where slug = 'belleza'),
  (select id from public.zones where slug = 'residencial-del-parque'),
  '5214420000104', '5214420000104', 'Plaza Zen, local 12',
  extensions.st_setsrid(extensions.st_makepoint(-100.3318, 20.6008), 4326)::extensions.geography,
  true, true, false, 'plata', 'activo', true, '10% de descuento al reservar por Expertalia 360'
where not exists (select 1 from public.businesses where slug = 'barberia-el-bigote');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'barberia-el-bigote'), 'reservar') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'barberia-el-bigote'), 0, '09:00', '21:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'barberia-el-bigote'), 1, '09:00', '21:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'barberia-el-bigote'), 2, '09:00', '21:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'barberia-el-bigote'), 3, '09:00', '21:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'barberia-el-bigote'), 4, '09:00', '21:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'barberia-el-bigote'), 5, '09:00', '21:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'barberia-el-bigote'), 6, '09:00', '21:00') on conflict do nothing;
insert into public.staff (business_id, name) select (select id from public.businesses where slug = 'barberia-el-bigote'), 'Luis' where not exists (select 1 from public.staff where business_id = (select id from public.businesses where slug = 'barberia-el-bigote') and name = 'Luis');
insert into public.staff (business_id, name) select (select id from public.businesses where slug = 'barberia-el-bigote'), 'Toño' where not exists (select 1 from public.staff where business_id = (select id from public.businesses where slug = 'barberia-el-bigote') and name = 'Toño');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'barberia-el-bigote'), 'cita', 'Corte clásico', null, null, 180, 40, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'barberia-el-bigote') and name = 'Corte clásico');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'barberia-el-bigote'), 'cita', 'Corte y barba', null, null, 260, 60, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'barberia-el-bigote') and name = 'Corte y barba');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'barberia-el-bigote'), 'cita', 'Corte infantil', null, null, 150, 30, true, 2 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'barberia-el-bigote') and name = 'Corte infantil');
insert into public.loyalty_programs (business_id, kind, goal, percent, reward) select (select id from public.businesses where slug = 'barberia-el-bigote'), 'sellos', 6, null, '50% en tu sexto corte' where not exists (select 1 from public.loyalty_programs where business_id = (select id from public.businesses where slug = 'barberia-el-bigote'));
insert into public.reviews (business_id, author_name, rating, body, reply) select (select id from public.businesses where slug = 'barberia-el-bigote'), 'Rodrigo M.', 5, 'Llegué a la hora y me atendieron de inmediato.', null where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'barberia-el-bigote') and author_name = 'Rodrigo M.' and body = 'Llegué a la hora y me atendieron de inmediato.');

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo)
select 'Estética Bella Luna', 'estetica-bella-luna', 'Salón de belleza', 'Corte, color, uñas y pestañas. Productos profesionales.',
  (select id from public.categories where slug = 'belleza'),
  (select id from public.zones where slug = 'el-mirador'),
  '5214420000105', '5214420000105', 'Calle Loto 18',
  extensions.st_setsrid(extensions.st_makepoint(-100.3335, 20.5985), 4326)::extensions.geography,
  true, true, false, 'plata', 'activo', true, '30% en tu primera visita'
where not exists (select 1 from public.businesses where slug = 'estetica-bella-luna');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'estetica-bella-luna'), 'reservar') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'estetica-bella-luna'), 0, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'estetica-bella-luna'), 1, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'estetica-bella-luna'), 2, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'estetica-bella-luna'), 3, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'estetica-bella-luna'), 4, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'estetica-bella-luna'), 5, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'estetica-bella-luna'), 6, '09:00', '20:00') on conflict do nothing;
insert into public.staff (business_id, name) select (select id from public.businesses where slug = 'estetica-bella-luna'), 'Karla' where not exists (select 1 from public.staff where business_id = (select id from public.businesses where slug = 'estetica-bella-luna') and name = 'Karla');
insert into public.staff (business_id, name) select (select id from public.businesses where slug = 'estetica-bella-luna'), 'Mónica' where not exists (select 1 from public.staff where business_id = (select id from public.businesses where slug = 'estetica-bella-luna') and name = 'Mónica');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'estetica-bella-luna'), 'cita', 'Corte de dama', null, null, 250, 45, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'estetica-bella-luna') and name = 'Corte de dama');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'estetica-bella-luna'), 'cita', 'Tinte completo', null, null, 650, 120, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'estetica-bella-luna') and name = 'Tinte completo');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'estetica-bella-luna'), 'cita', 'Uñas en gel', null, null, 320, 60, true, 2 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'estetica-bella-luna') and name = 'Uñas en gel');
insert into public.reviews (business_id, author_name, rating, body, reply) select (select id from public.businesses where slug = 'estetica-bella-luna'), 'Claudia R.', 5, 'Me encantó el color, muy profesionales.', null where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'estetica-bella-luna') and author_name = 'Claudia R.' and body = 'Me encantó el color, muy profesionales.');

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo)
select 'Dental Sonríe', 'dental-sonrie', 'Consultorio dental', 'Limpieza, resinas, ortodoncia y urgencias dentales.',
  (select id from public.categories where slug = 'salud'),
  (select id from public.zones where slug = 'residencial-del-parque'),
  '5214420000106', '5214420000106', 'Blvd. Zen 450, consultorio 3',
  extensions.st_setsrid(extensions.st_makepoint(-100.3342, 20.6031), 4326)::extensions.geography,
  true, true, false, 'plata', 'activo', true, '2x1 en limpieza dental'
where not exists (select 1 from public.businesses where slug = 'dental-sonrie');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'dental-sonrie'), 'reservar') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'dental-sonrie'), 0, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'dental-sonrie'), 1, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'dental-sonrie'), 2, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'dental-sonrie'), 3, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'dental-sonrie'), 4, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'dental-sonrie'), 5, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'dental-sonrie'), 6, '09:00', '19:00') on conflict do nothing;
insert into public.staff (business_id, name) select (select id from public.businesses where slug = 'dental-sonrie'), 'Dra. Pérez' where not exists (select 1 from public.staff where business_id = (select id from public.businesses where slug = 'dental-sonrie') and name = 'Dra. Pérez');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'dental-sonrie'), 'cita', 'Limpieza dental', null, null, 450, 40, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'dental-sonrie') and name = 'Limpieza dental');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'dental-sonrie'), 'cita', 'Valoración', null, null, 200, 20, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'dental-sonrie') and name = 'Valoración');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'dental-sonrie'), 'cotizacion', 'Ortodoncia', 'Precio según valoración', null, null, null, true, 2 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'dental-sonrie') and name = 'Ortodoncia');
insert into public.reviews (business_id, author_name, rating, body, reply) select (select id from public.businesses where slug = 'dental-sonrie'), 'Marta L.', 5, 'Sin dolor y muy bien explicado.', null where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'dental-sonrie') and author_name = 'Marta L.' and body = 'Sin dolor y muy bien explicado.');

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo)
select 'Lic. Mariana Ortiz', 'lic-mariana-ortiz', 'Abogada · derecho familiar', 'Divorcios, pensiones, custodia y testamentos. 12 años de experiencia. Cédula verificada.',
  (select id from public.categories where slug = 'profesionales'),
  (select id from public.zones where slug = 'zen-house'),
  '5214420000107', '5214420000107', 'Plaza Zen, local 8',
  extensions.st_setsrid(extensions.st_makepoint(-100.3254, 20.6012), 4326)::extensions.geography,
  true, true, false, 'plata', 'activo', true, null
where not exists (select 1 from public.businesses where slug = 'lic-mariana-ortiz');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'lic-mariana-ortiz'), 'reservar') on conflict do nothing;
insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'lic-mariana-ortiz'), 'cotizar') on conflict do nothing;
insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'lic-mariana-ortiz'), 'consulta') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'lic-mariana-ortiz'), 0, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'lic-mariana-ortiz'), 1, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'lic-mariana-ortiz'), 2, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'lic-mariana-ortiz'), 3, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'lic-mariana-ortiz'), 4, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'lic-mariana-ortiz'), 5, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'lic-mariana-ortiz'), 6, '09:00', '18:00') on conflict do nothing;
insert into public.staff (business_id, name) select (select id from public.businesses where slug = 'lic-mariana-ortiz'), 'Lic. Ortiz' where not exists (select 1 from public.staff where business_id = (select id from public.businesses where slug = 'lic-mariana-ortiz') and name = 'Lic. Ortiz');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'lic-mariana-ortiz'), 'cita', 'Consulta inicial', 'En despacho o videollamada', null, 500, 30, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'lic-mariana-ortiz') and name = 'Consulta inicial');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'lic-mariana-ortiz'), 'cotizacion', 'Divorcio voluntario', 'Precio según el caso', null, null, null, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'lic-mariana-ortiz') and name = 'Divorcio voluntario');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'lic-mariana-ortiz'), 'cotizacion', 'Pensión alimenticia', 'Precio según el caso', null, null, null, true, 2 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'lic-mariana-ortiz') and name = 'Pensión alimenticia');
insert into public.reviews (business_id, author_name, rating, body, reply) select (select id from public.businesses where slug = 'lic-mariana-ortiz'), 'Claudia R.', 5, 'Me explicó todo con claridad y la cotización llegó el mismo día.', null where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'lic-mariana-ortiz') and author_name = 'Claudia R.' and body = 'Me explicó todo con claridad y la cotización llegó el mismo día.');

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo)
select 'Taller Mecánico López', 'taller-mecanico-lopez', 'Mecánica general', 'Frenos, afinación, suspensión y diagnóstico por computadora.',
  (select id from public.categories where slug = 'autos-y-talleres'),
  (select id from public.zones where slug = 'cumbres-de-conin'),
  '5214420000108', '5214420000108', 'Av. Industrial 77',
  extensions.st_setsrid(extensions.st_makepoint(-100.3312, 20.6058), 4326)::extensions.geography,
  true, true, false, 'plata', 'activo', true, null
where not exists (select 1 from public.businesses where slug = 'taller-mecanico-lopez');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'taller-mecanico-lopez'), 'reservar') on conflict do nothing;
insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'taller-mecanico-lopez'), 'cotizar') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'taller-mecanico-lopez'), 0, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'taller-mecanico-lopez'), 1, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'taller-mecanico-lopez'), 2, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'taller-mecanico-lopez'), 3, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'taller-mecanico-lopez'), 4, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'taller-mecanico-lopez'), 5, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'taller-mecanico-lopez'), 6, '09:00', '19:00') on conflict do nothing;
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'taller-mecanico-lopez'), 'cita', 'Diagnóstico', null, null, 350, 60, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'taller-mecanico-lopez') and name = 'Diagnóstico');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'taller-mecanico-lopez'), 'cita', 'Afinación', null, null, 1200, 180, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'taller-mecanico-lopez') and name = 'Afinación');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'taller-mecanico-lopez'), 'cotizacion', 'Cambio de balatas', 'Según modelo del auto', null, null, null, true, 2 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'taller-mecanico-lopez') and name = 'Cambio de balatas');
insert into public.reviews (business_id, author_name, rating, body, reply) select (select id from public.businesses where slug = 'taller-mecanico-lopez'), 'Jorge V.', 5, 'Honestos, me mandaron fotos de las piezas.', null where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'taller-mecanico-lopez') and author_name = 'Jorge V.' and body = 'Honestos, me mandaron fotos de las piezas.');

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo)
select 'Refaccionaria Ruiz', 'refaccionaria-ruiz', 'Refacciones', 'Refacciones para todas las marcas. Precio especial a talleres.',
  (select id from public.categories where slug = 'autos-y-talleres'),
  (select id from public.zones where slug = 'cumbres-de-conin'),
  '5214420000109', '5214420000109', 'Av. Industrial 102',
  extensions.st_setsrid(extensions.st_makepoint(-100.3289, 20.6066), 4326)::extensions.geography,
  true, true, true, 'plata', 'activo', true, null
where not exists (select 1 from public.businesses where slug = 'refaccionaria-ruiz');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'refaccionaria-ruiz'), 'ordenar') on conflict do nothing;
insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'refaccionaria-ruiz'), 'cotizar') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'refaccionaria-ruiz'), 0, '09:00', '19:30') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'refaccionaria-ruiz'), 1, '09:00', '19:30') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'refaccionaria-ruiz'), 2, '09:00', '19:30') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'refaccionaria-ruiz'), 3, '09:00', '19:30') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'refaccionaria-ruiz'), 4, '09:00', '19:30') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'refaccionaria-ruiz'), 5, '09:00', '19:30') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'refaccionaria-ruiz'), 6, '09:00', '19:30') on conflict do nothing;
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'refaccionaria-ruiz'), 'producto', 'Balatas delanteras', 'Varias marcas', 'Frenos', 590, null, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'refaccionaria-ruiz') and name = 'Balatas delanteras');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'refaccionaria-ruiz'), 'producto', 'Bujías (juego de 4)', null, 'Afinación', 420, null, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'refaccionaria-ruiz') and name = 'Bujías (juego de 4)');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'refaccionaria-ruiz'), 'cotizacion', 'Otra pieza', 'Dinos marca, modelo y año', null, null, null, true, 2 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'refaccionaria-ruiz') and name = 'Otra pieza');
insert into public.reviews (business_id, author_name, rating, body, reply) select (select id from public.businesses where slug = 'refaccionaria-ruiz'), 'Taller López', 5, 'Responden rápido y con buen precio.', null where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'refaccionaria-ruiz') and author_name = 'Taller López' and body = 'Responden rápido y con buen precio.');

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo)
select 'Plomería Hernández', 'plomeria-hernandez', 'Plomería a domicilio', 'Fugas, instalaciones, calentadores y destapes. Servicio el mismo día.',
  (select id from public.categories where slug = 'hogar-y-oficios'),
  null,
  '5214420000110', '5214420000110', 'Servicio a domicilio',
  extensions.st_setsrid(extensions.st_makepoint(-100.3245, 20.5992), 4326)::extensions.geography,
  true, true, false, 'plata', 'activo', true, null
where not exists (select 1 from public.businesses where slug = 'plomeria-hernandez');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'plomeria-hernandez'), 'cotizar') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'plomeria-hernandez'), 0, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'plomeria-hernandez'), 1, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'plomeria-hernandez'), 2, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'plomeria-hernandez'), 3, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'plomeria-hernandez'), 4, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'plomeria-hernandez'), 5, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'plomeria-hernandez'), 6, '09:00', '20:00') on conflict do nothing;
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'plomeria-hernandez'), 'cotizacion', 'Reparar fuga', 'Visita y diagnóstico', null, null, null, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'plomeria-hernandez') and name = 'Reparar fuga');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'plomeria-hernandez'), 'cotizacion', 'Instalar calentador', null, null, null, null, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'plomeria-hernandez') and name = 'Instalar calentador');
insert into public.reviews (business_id, author_name, rating, body, reply) select (select id from public.businesses where slug = 'plomeria-hernandez'), 'Sofía N.', 5, 'Llegó en una hora y dejó todo limpio.', null where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'plomeria-hernandez') and author_name = 'Sofía N.' and body = 'Llegó en una hora y dejó todo limpio.');

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo)
select 'Papelería El Lápiz', 'papeleria-el-lapiz', 'Papelería · impresiones', 'Útiles escolares, copias, impresiones y regalos.',
  (select id from public.categories where slug = 'tiendas'),
  (select id from public.zones where slug = 'zen-house'),
  '5214420000111', '5214420000111', 'Calle Zen 5',
  extensions.st_setsrid(extensions.st_makepoint(-100.3281, 20.6005), 4326)::extensions.geography,
  true, true, false, 'plata', 'activo', false, null
where not exists (select 1 from public.businesses where slug = 'papeleria-el-lapiz');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'papeleria-el-lapiz'), 'ordenar') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'papeleria-el-lapiz'), 0, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'papeleria-el-lapiz'), 1, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'papeleria-el-lapiz'), 2, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'papeleria-el-lapiz'), 3, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'papeleria-el-lapiz'), 4, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'papeleria-el-lapiz'), 5, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'papeleria-el-lapiz'), 6, '09:00', '20:00') on conflict do nothing;
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'papeleria-el-lapiz'), 'producto', 'Impresión a color', 'Por hoja', null, 8, null, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'papeleria-el-lapiz') and name = 'Impresión a color');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'papeleria-el-lapiz'), 'producto', 'Cuaderno profesional', null, null, 45, null, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'papeleria-el-lapiz') and name = 'Cuaderno profesional');

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo)
select 'Repostería Dulce Bruma', 'reposteria-dulce-bruma', 'Pasteles por encargo', 'Pasteles, cupcakes y mesas de postres por encargo.',
  (select id from public.categories where slug = 'cafe-y-postres'),
  (select id from public.zones where slug = 'el-mirador'),
  '5214420000112', '5214420000112', 'Calle Jazmín 41',
  extensions.st_setsrid(extensions.st_makepoint(-100.3302, 20.5979), 4326)::extensions.geography,
  true, true, true, 'plata', 'activo', true, null
where not exists (select 1 from public.businesses where slug = 'reposteria-dulce-bruma');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'reposteria-dulce-bruma'), 'ordenar') on conflict do nothing;
insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'reposteria-dulce-bruma'), 'cotizar') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'reposteria-dulce-bruma'), 0, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'reposteria-dulce-bruma'), 1, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'reposteria-dulce-bruma'), 2, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'reposteria-dulce-bruma'), 3, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'reposteria-dulce-bruma'), 4, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'reposteria-dulce-bruma'), 5, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'reposteria-dulce-bruma'), 6, '09:00', '19:00') on conflict do nothing;
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'reposteria-dulce-bruma'), 'producto', 'Rebanada de pastel', null, 'Del día', 65, null, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'reposteria-dulce-bruma') and name = 'Rebanada de pastel');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'reposteria-dulce-bruma'), 'producto', 'Caja de 6 cupcakes', null, 'Del día', 180, null, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'reposteria-dulce-bruma') and name = 'Caja de 6 cupcakes');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'reposteria-dulce-bruma'), 'cotizacion', 'Pastel personalizado', 'Dinos tema y número de personas', 'Encargos', null, null, true, 2 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'reposteria-dulce-bruma') and name = 'Pastel personalizado');
insert into public.reviews (business_id, author_name, rating, body, reply) select (select id from public.businesses where slug = 'reposteria-dulce-bruma'), 'Laura M.', 5, 'El pastel de cumpleaños quedó idéntico a la foto.', null where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'reposteria-dulce-bruma') and author_name = 'Laura M.' and body = 'El pastel de cumpleaños quedó idéntico a la foto.');

-- Anuncios al abrir la app (activos durante 30 días)
insert into public.opening_ads (business_id, headline, body, cta, color, status) select (select id from public.businesses where slug = 'cafe-la-esquina'), '2x1 en waffles', 'Hoy de 4 a 6 pm. Enseña la app en caja.', 'Ver menú', '#E04A1F', 'activa' where not exists (select 1 from public.opening_ads where business_id = (select id from public.businesses where slug = 'cafe-la-esquina') and headline = '2x1 en waffles');
insert into public.opening_ads (business_id, headline, body, cta, color, status) select (select id from public.businesses where slug = 'estetica-bella-luna'), '30% en tu primera visita', 'Corte, tinte o uñas. Agenda desde aquí.', 'Reservar', '#E8457C', 'activa' where not exists (select 1 from public.opening_ads where business_id = (select id from public.businesses where slug = 'estetica-bella-luna') and headline = '30% en tu primera visita');
insert into public.opening_ads (business_id, headline, body, cta, color, status) select (select id from public.businesses where slug = 'reposteria-dulce-bruma'), 'Pasteles por encargo', 'Pide hoy y recógelo mañana en Zen House.', 'Ver pasteles', '#7B4FE0', 'activa' where not exists (select 1 from public.opening_ads where business_id = (select id from public.businesses where slug = 'reposteria-dulce-bruma') and headline = 'Pasteles por encargo');
insert into public.opening_ads (business_id, headline, body, cta, color, status) select (select id from public.businesses where slug = 'fonda-dona-lupe'), 'Postre gratis', 'En pedidos desde $250 a domicilio.', 'Pedir comida', '#12A06E', 'activa' where not exists (select 1 from public.opening_ads where business_id = (select id from public.businesses where slug = 'fonda-dona-lupe') and headline = 'Postre gratis');

