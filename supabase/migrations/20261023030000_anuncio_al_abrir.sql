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
