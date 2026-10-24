/**
 * Genera supabase/seed_demo.sql con los negocios ficticios de src/data/mock.ts,
 * para que la base de datos y la app muestren lo mismo durante las pruebas.
 *
 *   npx tsx scripts/generate-demo-seed.ts
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { OPENING_ADS } from '../src/data/ads';
import { BUSINESSES } from '../src/data/mock';

const ZONE_SLUG: Record<string, string> = {
  'Zen House': 'zen-house',
  'Residencial del Parque': 'residencial-del-parque',
  'El Mirador': 'el-mirador',
  'Cumbres de Conín': 'cumbres-de-conin',
};

const q = (v: string | number | boolean | undefined | null) =>
  v === undefined || v === null ? 'null' : typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : String(v);

const out: string[] = [
  '-- Negocios de ejemplo (ficticios) para probar la app. Generado por apps/mobile/scripts/generate-demo-seed.ts',
  '-- Para borrarlos: delete from public.businesses where slug in (...);',
  '',
];

for (const b of BUSINESSES) {
  const zone = ZONE_SLUG[b.zone];
  out.push(
    `insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo)`,
    `select ${q(b.name)}, ${q(b.slug)}, ${q(b.subtitle)}, ${q(b.description)},`,
    `  (select id from public.categories where slug = ${q(b.categorySlug)}),`,
    `  ${zone ? `(select id from public.zones where slug = ${q(zone)})` : 'null'},`,
    `  ${q(b.phone)}, ${q(b.phone)}, ${q(b.address)},`,
    `  extensions.st_setsrid(extensions.st_makepoint(${b.lng}, ${b.lat}), 4326)::extensions.geography,`,
    `  ${b.isOpen}, true, ${b.delivers}, 'plata', 'activo', ${b.verified}, ${q(b.promo)}`,
    `where not exists (select 1 from public.businesses where slug = ${q(b.slug)});`,
    '',
  );
  const bid = `(select id from public.businesses where slug = ${q(b.slug)})`;
  for (const m of b.modules) {
    out.push(`insert into public.business_modules (business_id, module) values (${bid}, ${q(m)}) on conflict do nothing;`);
  }
  for (let d = 0; d < 7; d++) {
    out.push(`insert into public.business_hours (business_id, weekday, opens, closes) values (${bid}, ${d}, '09:00', ${q(b.closesAt)}) on conflict do nothing;`);
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
  if (b.loyalty) {
    out.push(
      `insert into public.loyalty_programs (business_id, kind, goal, percent, reward) select ${bid}, ${q(b.loyalty.kind)}, ${q(b.loyalty.goal)}, ${q(b.loyalty.percent)}, ${q(b.loyalty.reward)} where not exists (select 1 from public.loyalty_programs where business_id = ${bid});`,
    );
  }
  for (const r of b.reviews) {
    out.push(
      `insert into public.reviews (business_id, author_name, rating, body, reply) select ${bid}, ${q(r.author)}, ${r.rating}, ${q(r.body)}, ${q(r.reply)} where not exists (select 1 from public.reviews where business_id = ${bid} and author_name = ${q(r.author)} and body = ${q(r.body)});`,
    );
  }
  out.push('');
}

out.push('-- Anuncios al abrir la app (activos durante 30 días)');
for (const a of OPENING_ADS) {
  const bid = `(select id from public.businesses where slug = ${q(a.businessSlug)})`;
  out.push(
    `insert into public.opening_ads (business_id, headline, body, cta, color, status) select ${bid}, ${q(a.headline)}, ${q(a.body)}, ${q(a.cta)}, ${q(a.color)}, 'activa' where not exists (select 1 from public.opening_ads where business_id = ${bid} and headline = ${q(a.headline)});`,
  );
}
out.push('');

const file = resolve(__dirname, '../../../supabase/seed_demo.sql');
writeFileSync(file, out.join('\n'));
console.log(`Escrito ${file} con ${BUSINESSES.length} negocios`);
