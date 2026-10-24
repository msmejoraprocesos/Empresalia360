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
