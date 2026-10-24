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
