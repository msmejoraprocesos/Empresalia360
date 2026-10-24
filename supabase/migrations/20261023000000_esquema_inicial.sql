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
