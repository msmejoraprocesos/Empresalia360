/**
 * Genera, a partir de src/data/mock.ts (lo mismo que muestra la app):
 *   supabase/seed.sql       zonas, categorías de los dos mundos y especialidades
 *   supabase/seed_demo.sql  profesionistas y oficios de ejemplo, galería, paquetes, reseñas,
 *                           muro, preguntas con respuestas y anuncios al abrir
 *
 *   npx tsx scripts/generate-demo-seed.ts
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { OPENING_ADS } from '../src/data/ads';
import { demoBilling } from '../src/data/billing';
import { BUSINESSES, CATEGORIES, POSTS, QUESTIONS, ZONE } from '../src/data/mock';

const q = (v: string | number | boolean | undefined | null): string =>
  v === undefined || v === null ? 'null' : typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : String(v);
const arr = (v: string[] | undefined) => (v && v.length ? `array[${v.map(q).join(', ')}]::text[]` : `'{}'::text[]`);
const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/** "hace 3 h", "ayer", "hace 2 meses" → intervalo para created_at */
function ago(label: string): string {
  const m = label.match(/(\d+)\s*(min|h|d[ií]a|semana|mes)/i);
  if (label.includes('ayer')) return `now() - interval '1 day'`;
  if (!m) return 'now()';
  const n = Number(m[1]);
  const unit = m[2].toLowerCase().startsWith('min') ? 'minutes' : m[2] === 'h' ? 'hours' : m[2].startsWith('d') ? 'days' : m[2].startsWith('sem') ? 'weeks' : 'months';
  return `now() - interval '${n} ${unit}'`;
}

// ─────────────────────────────────────────────────────────────
// seed.sql
// ─────────────────────────────────────────────────────────────
const zones = [...new Set([ZONE.name, ...BUSINESSES.map((b) => b.zone)])];
const seed: string[] = [
  '-- Datos base de Expertalia 360: zonas, categorías (profesionistas y oficios) y especialidades.',
  '-- Generado por apps/mobile/scripts/generate-demo-seed.ts a partir de src/data/mock.ts',
  '',
  'insert into public.zones (name, municipality, state, slug) values',
  zones.map((z) => `  (${q(z)}, ${q(ZONE.municipality)}, 'Querétaro', ${q(slugify(z))})`).join(',\n'),
  'on conflict (slug) do nothing;',
  '',
];
CATEGORIES.forEach((c, i) => {
  seed.push(
    `insert into public.categories (name, slug, color, icon, position, world, professional, emoji, ink) values (${q(c.name)}, ${q(c.slug)}, ${q(c.color)}, ${q(c.icon)}, ${i + 1}, ${q(c.group)}, ${q(c.professional)}, ${q(c.emoji)}, ${q(c.ink)})`,
    `  on conflict (slug) do update set name = excluded.name, color = excluded.color, icon = excluded.icon, position = excluded.position, world = excluded.world, professional = excluded.professional, emoji = excluded.emoji, ink = excluded.ink;`,
  );
  c.specialties.forEach((s, j) => {
    seed.push(
      `insert into public.specialties (category_id, name, emoji, keywords, position) select id, ${q(s.name)}, ${q(s.emoji)}, ${arr(s.keywords)}, ${j} from public.categories where slug = ${q(c.slug)} on conflict (category_id, name) do update set emoji = excluded.emoji, keywords = excluded.keywords, position = excluded.position;`,
    );
  });
  seed.push('');
});

// ─────────────────────────────────────────────────────────────
// seed_demo.sql
// ─────────────────────────────────────────────────────────────
const out: string[] = [
  '-- Profesionistas y oficios de ejemplo (ficticios) para probar la app.',
  '-- Generado por apps/mobile/scripts/generate-demo-seed.ts a partir de src/data/mock.ts',
  '-- No tienen dueño: cualquier profesional real puede "reclamar" su perfil desde la app.',
  '-- Para borrarlos todos: delete from public.businesses where owner_id is null;',
  '',
];

const BILLING = demoBilling(BUSINESSES);

for (const b of BUSINESSES) {
  out.push(
    `insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo,`,
    `  profession, specialties, extra_categories, years_exp, license, education, languages, attends, consult_price, response_time, directions, urgent24, warranty, payment_info, logo_url, cover_url)`,
    `select ${q(b.name)}, ${q(b.slug)}, ${q(b.subtitle)}, ${q(b.description)},`,
    `  (select id from public.categories where slug = ${q(b.categorySlug)}),`,
    `  (select id from public.zones where slug = ${q(slugify(b.zone))}),`,
    `  ${q(b.phone)}, ${q(b.phone)}, ${q(b.address)},`,
    `  extensions.st_setsrid(extensions.st_makepoint(${b.lng}, ${b.lat}), 4326)::extensions.geography,`,
    `  ${b.isOpen}, true, ${b.delivers}, 'premium', 'activo', ${b.verified}, ${q(b.promo)},`,
    `  ${q(b.profession)}, ${arr(b.specialties)}, ${arr(b.categorySlugs)}, ${b.yearsExp}, ${q(b.license)}, ${q(b.education)}, ${arr(b.languages)}, ${arr(b.attends)}, ${q(b.consultPrice)}, ${q(b.responseTime)}, ${q(b.references)}, ${Boolean(b.urgent24)}, ${q(b.warranty)}, ${q(b.paymentInfo)}, ${q(b.photo?.startsWith('http') ? b.photo : undefined)}, ${q(b.cover?.startsWith('http') ? b.cover : undefined)}`,
    `where not exists (select 1 from public.businesses where slug = ${q(b.slug)});`,
    '',
  );
  const bid = `(select id from public.businesses where slug = ${q(b.slug)})`;
  for (const m of b.modules) {
    out.push(`insert into public.business_modules (business_id, module) values (${bid}, ${q(m)}) on conflict do nothing;`);
  }
  for (let d = 1; d <= 6; d++) {
    out.push(`insert into public.business_hours (business_id, weekday, opens, closes) values (${bid}, ${d}, '09:00', ${q(/^\d\d:\d\d$/.test(b.closesAt) ? b.closesAt : '18:00')}) on conflict do nothing;`);
  }
  for (const s of b.staff ?? []) {
    if (s === 'Cualquiera') continue;
    out.push(`insert into public.staff (business_id, name) select ${bid}, ${q(s)} where not exists (select 1 from public.staff where business_id = ${bid} and name = ${q(s)});`);
  }
  b.items.forEach((it, i) => {
    out.push(
      `insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select ${bid}, ${q(it.kind)}, ${q(it.name)}, ${q(it.description)}, ${q(it.section)}, ${q(it.price)}, ${q(it.durationMin)}, ${it.available}, ${i} where not exists (select 1 from public.catalog_items where business_id = ${bid} and name = ${q(it.name)});`,
    );
  });
  (b.gallery ?? []).forEach((g, i) => {
    out.push(
      `insert into public.business_photos (business_id, url, caption, color, position) select ${bid}, ${q(g.uri?.startsWith('http') ? g.uri : undefined)}, ${q(g.caption)}, ${q(g.color)}, ${i} where not exists (select 1 from public.business_photos where business_id = ${bid} and caption = ${q(g.caption)});`,
    );
  });
  if (b.loyalty) {
    out.push(
      `insert into public.loyalty_programs (business_id, kind, goal, percent, reward) select ${bid}, ${q(b.loyalty.kind)}, ${q(b.loyalty.goal)}, ${q(b.loyalty.percent)}, ${q(b.loyalty.reward)} where not exists (select 1 from public.loyalty_programs where business_id = ${bid});`,
    );
  }
  for (const r of b.reviews) {
    out.push(
      `insert into public.reviews (business_id, author_name, rating, body, reply, created_at) select ${bid}, ${q(r.author)}, ${r.rating}, ${q(r.body)}, ${q(r.reply)}, ${ago(r.dateLabel)} where not exists (select 1 from public.reviews where business_id = ${bid} and author_name = ${q(r.author)} and body = ${q(r.body)});`,
    );
  }
  // La calificación de ejemplo se respeta (las reseñas de ejemplo son solo una muestra)
  out.push(`update public.businesses set rating_avg = ${b.rating.toFixed(1)}, rating_count = ${b.ratingCount}, verified = ${b.verified} where slug = ${q(b.slug)};`);
  // Mensualidad de ejemplo: fecha relativa a hoy, para ver cada caso (al corriente, por vencer, vencido…)
  const bill = BILLING[b.slug];
  const off = bill.paidUntil ? Math.round((new Date(`${bill.paidUntil}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 86400000) : null;
  out.push(
    off === null
      ? `update public.businesses set plan = 'estandar', paid_plan = 'estandar', paid_until = current_date + 30, plan_status = 'al_corriente' where slug = ${q(b.slug)};`
      : `update public.businesses set plan = ${q(bill.plan)}, paid_plan = ${q(bill.plan)}, paid_until = current_date + ${off}, plan_status = public.billing_status(${q(bill.plan)}, current_date + ${off}), hidden_unpaid = public.billing_status(${q(bill.plan)}, current_date + ${off}) = 'suspendido' where slug = ${q(b.slug)};`,
  );
  if (bill.auto === 'activo') out.push(`update public.businesses set mp_status = 'activo', mp_plan = ${q(bill.plan)} where slug = ${q(b.slug)};`);
  for (const p of bill.payments) {
    out.push(
      `insert into public.subscription_payments (business_id, plan, months, amount, method, reference, status, period_end, created_at, created_by) select ${bid}, ${q(p.plan)}, ${p.months}, ${p.amount}, ${q(p.method)}, ${q(p.reference)}, ${q(p.status)}, ${p.status === 'pagado' && off !== null ? `current_date + ${off}` : 'null'}, now() - interval '${Math.max(0, Math.round((Date.now() - p.createdAt) / 3600000))} hours', null where not exists (select 1 from public.subscription_payments where business_id = ${bid} and reference = ${q(p.reference)});`,
    );
  }
  out.push('');
}

out.push('-- Muro de la comunidad');
for (const p of POSTS) {
  const bid = `(select id from public.businesses where slug = ${q(p.businessSlug)})`;
  out.push(
    `insert into public.posts (business_id, kind, title, body, specialty, price, price_note, likes_count, created_at) select ${bid}, ${q(p.kind)}, ${q(p.title)}, ${q(p.body)}, ${q(p.specialty)}, ${q(p.price)}, ${q(p.priceNote)}, ${p.likes}, ${ago(p.dateLabel)} where not exists (select 1 from public.posts where title = ${q(p.title)});`,
  );
  for (const c of p.comments) {
    out.push(
      `insert into public.post_comments (post_id, author_name, body) select (select id from public.posts where title = ${q(p.title)}), ${q(c.author)}, ${q(c.body)} where not exists (select 1 from public.post_comments pc join public.posts po on po.id = pc.post_id where po.title = ${q(p.title)} and pc.body = ${q(c.body)});`,
    );
  }
}
out.push('');

out.push('-- Preguntas a expertos con sus respuestas');
for (const qu of QUESTIONS) {
  out.push(
    `insert into public.questions (category_id, author_name, specialty, body, created_at) select (select id from public.categories where slug = ${q(qu.categorySlug)}), ${q(qu.author)}, ${q(qu.specialty)}, ${q(qu.body)}, ${ago(qu.dateLabel)} where not exists (select 1 from public.questions where body = ${q(qu.body)});`,
  );
  for (const a of qu.answers) {
    out.push(
      `insert into public.answers (question_id, business_id, body, helpful_count) select (select id from public.questions where body = ${q(qu.body)}), (select id from public.businesses where slug = ${q(a.businessSlug)}), ${q(a.body)}, ${a.helpful} where not exists (select 1 from public.answers where body = ${q(a.body)});`,
    );
  }
}
out.push('');

out.push('-- Anuncios al abrir la app');
for (const a of OPENING_ADS) {
  const bid = `(select id from public.businesses where slug = ${q(a.businessSlug)})`;
  out.push(
    `insert into public.opening_ads (business_id, headline, body, cta, color, status) select ${bid}, ${q(a.headline)}, ${q(a.body)}, ${q(a.cta)}, ${q(a.color)}, 'activa' where not exists (select 1 from public.opening_ads where business_id = ${bid} and headline = ${q(a.headline)});`,
  );
}
out.push('');

const dir = resolve(__dirname, '../../../supabase');
writeFileSync(resolve(dir, 'seed.sql'), seed.join('\n'));
writeFileSync(resolve(dir, 'seed_demo.sql'), out.join('\n'));
console.log(`seed.sql: ${zones.length} zonas, ${CATEGORIES.length} categorías · seed_demo.sql: ${BUSINESSES.length} expertos, ${POSTS.length} publicaciones, ${QUESTIONS.length} preguntas`);
