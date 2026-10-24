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
