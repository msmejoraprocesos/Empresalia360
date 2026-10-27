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
