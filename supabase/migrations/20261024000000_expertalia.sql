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
