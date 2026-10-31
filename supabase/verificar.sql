-- Expertalia 360 · ¿Mi base de Supabase tiene todo instalado?
-- Pégalo en Supabase → SQL Editor → New query → Run. No cambia nada, solo revisa.
-- Sale una fila por cada archivo de supabase/migrations: ✅ completo o ❌ con lo que le falta.
-- Si alguno sale ❌, pega y corre ESE archivo de migración (y los que le siguen, en orden).

with checks(orden, archivo, tipo, nombre) as (
  values
  -- 1. Esquema inicial
  (1, '20261023000000_esquema_inicial.sql', 'tabla', 'profiles'),
  (1, '20261023000000_esquema_inicial.sql', 'tabla', 'businesses'),
  (1, '20261023000000_esquema_inicial.sql', 'tabla', 'categories'),
  (1, '20261023000000_esquema_inicial.sql', 'tabla', 'zones'),
  (1, '20261023000000_esquema_inicial.sql', 'tabla', 'catalog_items'),
  (1, '20261023000000_esquema_inicial.sql', 'tabla', 'reviews'),
  (1, '20261023000000_esquema_inicial.sql', 'tabla', 'business_modules'),
  (1, '20261023000000_esquema_inicial.sql', 'tabla', 'business_hours'),
  (1, '20261023000000_esquema_inicial.sql', 'funcion', 'is_admin'),
  (1, '20261023000000_esquema_inicial.sql', 'funcion', 'owns_business'),
  (1, '20261023000000_esquema_inicial.sql', 'funcion', 'handle_new_user'),
  -- 2. Directorio y reseñas
  (2, '20261023010000_directorio_y_resenas.sql', 'columna', 'businesses.verified'),
  (2, '20261023010000_directorio_y_resenas.sql', 'columna', 'businesses.lat'),
  (2, '20261023010000_directorio_y_resenas.sql', 'columna', 'reviews.author_name'),
  (2, '20261023010000_directorio_y_resenas.sql', 'funcion', 'reviews_set_author_name'),
  -- 3. Estadísticas
  (3, '20261023020000_estadisticas.sql', 'tabla', 'business_events'),
  (3, '20261023020000_estadisticas.sql', 'funcion', 'business_stats'),
  -- 4. Anuncio al abrir
  (4, '20261023030000_anuncio_al_abrir.sql', 'tabla', 'opening_ads'),
  -- 5. Fotos
  (5, '20261023040000_fotos.sql', 'funcion', 'owns_photo_folder'),
  (5, '20261023040000_fotos.sql', 'bucket', 'fotos'),
  -- 6. Expertalia (profesionistas y oficios)
  (6, '20261024000000_expertalia.sql', 'columna', 'categories.world'),
  (6, '20261024000000_expertalia.sql', 'columna', 'businesses.specialties'),
  (6, '20261024000000_expertalia.sql', 'columna', 'businesses.extra_categories'),
  (6, '20261024000000_expertalia.sql', 'columna', 'businesses.payment_info'),
  (6, '20261024000000_expertalia.sql', 'tabla', 'specialties'),
  (6, '20261024000000_expertalia.sql', 'tabla', 'business_photos'),
  (6, '20261024000000_expertalia.sql', 'tabla', 'business_claims'),
  (6, '20261024000000_expertalia.sql', 'tabla', 'posts'),
  (6, '20261024000000_expertalia.sql', 'tabla', 'questions'),
  (6, '20261024000000_expertalia.sql', 'tabla', 'answers'),
  (6, '20261024000000_expertalia.sql', 'tabla', 'requests'),
  (6, '20261024000000_expertalia.sql', 'funcion', 'my_business_slug'),
  (6, '20261024000000_expertalia.sql', 'trigger', 'businesses_protect'),
  -- 7. Mensualidades
  (7, '20261025000000_mensualidades.sql', 'tabla', 'plans'),
  (7, '20261025000000_mensualidades.sql', 'tabla', 'subscription_payments'),
  (7, '20261025000000_mensualidades.sql', 'columna', 'plans.monthly_price_oficios'),
  (7, '20261025000000_mensualidades.sql', 'columna', 'plans.max_categories'),
  (7, '20261025000000_mensualidades.sql', 'columna', 'businesses.paid_until'),
  (7, '20261025000000_mensualidades.sql', 'columna', 'businesses.hidden_unpaid'),
  (7, '20261025000000_mensualidades.sql', 'funcion', 'refresh_billing'),
  (7, '20261025000000_mensualidades.sql', 'funcion', 'confirm_subscription_payment'),
  (7, '20261025000000_mensualidades.sql', 'funcion', 'businesses_limit_categories'),
  (7, '20261025000000_mensualidades.sql', 'trigger', 'businesses_categories_limit'),
  (7, '20261025000000_mensualidades.sql', 'bucket', 'comprobantes'),
  -- 8. Cobro automático (Mercado Pago), avisos y administración
  (8, '20261026000000_cobro_automatico.sql', 'columna', 'businesses.mp_status'),
  (8, '20261026000000_cobro_automatico.sql', 'columna', 'businesses.created_by_admin'),
  (8, '20261026000000_cobro_automatico.sql', 'columna', 'subscription_payments.external_id'),
  (8, '20261026000000_cobro_automatico.sql', 'tabla', 'billing_notices'),
  (8, '20261026000000_cobro_automatico.sql', 'funcion', 'is_service'),
  (8, '20261026000000_cobro_automatico.sql', 'funcion', 'apply_mp_payment'),
  (8, '20261026000000_cobro_automatico.sql', 'funcion', 'billing_notice_queue'),
  (8, '20261026000000_cobro_automatico.sql', 'funcion', 'admin_claims'),
  (8, '20261026000000_cobro_automatico.sql', 'trigger', 'catalog_items_limit'),
  (8, '20261026000000_cobro_automatico.sql', 'trigger', 'posts_limit')
), revisado as (
  select c.*, case c.tipo
    when 'tabla' then to_regclass('public.' || c.nombre) is not null
    when 'columna' then exists (select 1 from information_schema.columns
                                where table_schema = 'public' and table_name = split_part(c.nombre, '.', 1) and column_name = split_part(c.nombre, '.', 2))
    when 'funcion' then exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = c.nombre)
    when 'trigger' then exists (select 1 from pg_trigger where tgname = c.nombre and not tgisinternal)
    when 'bucket' then exists (select 1 from storage.buckets where id = c.nombre)
  end as ok
  from checks c
)
select orden as "#", archivo,
       case when bool_and(ok) then '✅ completo' else '❌ incompleto' end as estado,
       coalesce(string_agg(tipo || ' ' || nombre, ', ') filter (where not ok), '') as "le falta"
from revisado
group by orden, archivo
union all
select 9, 'seed.sql (categorías y zonas)',
       case when (select count(*) from public.categories) >= 6 and (select count(*) from public.zones) >= 1 then '✅ completo' else '❌ incompleto' end,
       (select count(*) from public.categories) || ' categorías (deben ser al menos 6), ' || (select count(*) from public.zones) || ' zonas'
where to_regclass('public.categories') is not null
union all
select 10, 'Revisión diaria (pg_cron)',
       case when exists (select 1 from pg_extension where extname = 'pg_cron') then '✅ pg_cron activo' else '❌ falta activar pg_cron' end,
       case when exists (select 1 from pg_extension where extname = 'pg_cron') then '' else 'Database → Extensions → pg_cron, luego corre el bloque final de 20261025000000_mensualidades.sql' end
union all
select 11, 'Tu cuenta de administrador',
       case when exists (select 1 from public.profiles where role = 'admin') then '✅ hay administrador' else '❌ sin administrador' end,
       coalesce((select string_agg(u.email, ', ') from public.profiles p join auth.users u on u.id = p.id where p.role = 'admin'), 'Entra a la app con tu correo y corre el paso 5 de la guía')
where to_regclass('public.profiles') is not null
order by 1;
