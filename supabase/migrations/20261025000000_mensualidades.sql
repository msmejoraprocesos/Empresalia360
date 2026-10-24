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
      and exists (select 1 from public.categories x where x.slug = t.c)
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
