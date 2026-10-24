import { supabase } from '@/lib/supabase';

import { OPENING_ADS } from './ads';
import { BUSINESSES } from './mock';
import type { Business, CatalogItem, Module, Review } from './types';

type Row = {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  is_open: boolean;
  delivers: boolean;
  verified: boolean;
  promo: string | null;
  rating_avg: number;
  rating_count: number;
  lat: number | null;
  lng: number | null;
  categories: { slug: string } | null;
  zones: { name: string } | null;
  business_modules: { module: string }[];
  business_hours: { weekday: number; opens: string; closes: string }[];
  staff: { name: string; active: boolean }[];
  catalog_items: {
    id: string;
    kind: CatalogItem['kind'];
    name: string;
    description: string | null;
    section: string | null;
    price: number | null;
    duration_min: number | null;
    is_available: boolean;
    position: number;
    image_url: string | null;
  }[];
  loyalty_programs: { kind: 'sellos' | 'puntos'; goal: number | null; percent: number | null; reward: string; active: boolean }[];
  reviews: { id: string; author_name: string | null; rating: number; body: string | null; verified: boolean; reply: string | null; created_at: string; hidden: boolean }[];
};

const SELECT = `
  id, slug, name, subtitle, description, address, phone, whatsapp, is_open, delivers, verified, promo,
  rating_avg, rating_count, lat, lng,
  categories ( slug ),
  zones ( name ),
  business_modules ( module ),
  business_hours ( weekday, opens, closes ),
  staff ( name, active ),
  catalog_items ( id, kind, name, description, section, price, duration_min, is_available, position, image_url ),
  loyalty_programs ( kind, goal, percent, reward, active ),
  reviews ( id, author_name, rating, body, verified, reply, created_at, hidden )
`;

function ago(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days < 1) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  if (days < 30) return `hace ${Math.floor(days / 7)} semana${days < 14 ? '' : 's'}`;
  return `hace ${Math.floor(days / 30)} mes${days < 60 ? '' : 'es'}`;
}

function toBusiness(r: Row): Business {
  const today = new Date().getDay();
  const hours = r.business_hours.find((h) => h.weekday === today);
  const loyalty = r.loyalty_programs.find((l) => l.active);
  const reviews: Review[] = r.reviews
    .filter((v) => !v.hidden)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((v) => ({
      id: v.id,
      author: v.author_name ?? 'Vecino',
      rating: v.rating,
      body: v.body ?? '',
      verified: v.verified,
      dateLabel: ago(v.created_at),
      reply: v.reply ?? undefined,
    }));
  const staff = r.staff.filter((s) => s.active).map((s) => s.name);

  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    categorySlug: r.categories?.slug ?? 'tiendas',
    subtitle: r.subtitle ?? '',
    description: r.description ?? '',
    address: r.address ?? '',
    zone: r.zones?.name ?? 'El Marqués',
    lat: r.lat ?? 0,
    lng: r.lng ?? 0,
    rating: Number(r.rating_avg) || 0,
    ratingCount: r.rating_count,
    isOpen: r.is_open,
    closesAt: hours ? hours.closes.slice(0, 5) : '—',
    phone: r.whatsapp ?? r.phone ?? '',
    modules: r.business_modules.map((m) => m.module).filter((m): m is Module => ['ordenar', 'reservar', 'cotizar', 'consulta'].includes(m)),
    delivers: r.delivers,
    verified: r.verified,
    promo: r.promo ?? undefined,
    staff: staff.length ? ['Cualquiera', ...staff] : undefined,
    loyalty: loyalty ? { kind: loyalty.kind, goal: loyalty.goal ?? undefined, percent: loyalty.percent ?? undefined, reward: loyalty.reward } : undefined,
    items: [...r.catalog_items]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({
        id: i.id,
        kind: i.kind,
        name: i.name,
        description: i.description ?? undefined,
        section: i.section ?? undefined,
        price: i.price ?? undefined,
        durationMin: i.duration_min ?? undefined,
        available: i.is_available,
        photo: i.image_url ?? undefined,
      })),
    reviews,
  };
}

export type CatalogSource = 'supabase' | 'ejemplo';

/** Resultado de la última carga, para mostrarlo en el perfil. */
export const catalogStatus: { source: CatalogSource; error?: string } = { source: 'ejemplo' };

/**
 * Carga negocios, catálogo y reseñas desde Supabase y reemplaza el contenido de
 * BUSINESSES (las pantallas leen de ahí). Si no hay conexión o falla, se quedan
 * los datos de ejemplo.
 */
export async function loadCatalog(timeoutMs = 7000): Promise<{ source: CatalogSource; error?: string }> {
  if (!supabase) return { source: 'ejemplo' };
  try {
    const query = supabase.from('businesses').select(SELECT).eq('status', 'activo').order('name');
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado')), timeoutMs));
    const { data, error } = (await Promise.race([query, timeout])) as { data: Row[] | null; error: { message: string } | null };
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return Object.assign(catalogStatus, { source: 'ejemplo' as const, error: 'La base de datos no tiene negocios activos todavía' });
    // Se conserva el mismo objeto de cada negocio (otras partes de la app ya lo tienen referenciado)
    const next = data.map(toBusiness).map((nb) => {
      const old = BUSINESSES.find((b) => b.slug === nb.slug);
      return old ? Object.assign(old, nb) : nb;
    });
    BUSINESSES.splice(0, BUSINESSES.length, ...next);
    await loadOpeningAds();
    return Object.assign(catalogStatus, { source: 'supabase' as const, error: undefined });
  } catch (e) {
    return Object.assign(catalogStatus, { source: 'ejemplo' as const, error: e instanceof Error ? e.message : String(e) });
  }
}

/** Anuncios al abrir la app vigentes (la política de la tabla solo deja ver los activos). */
async function loadOpeningAds() {
  if (!supabase) return;
  const { data, error } = await supabase
    .from('opening_ads')
    .select('id, headline, body, cta, color, image_url, businesses ( slug )')
    .eq('status', 'activa');
  if (error || !data) return;
  type AdRow = { id: string; headline: string; body: string | null; cta: string; color: string; image_url: string | null; businesses: { slug: string } | null };
  const ads = (data as unknown as AdRow[])
    .filter((a) => a.businesses?.slug)
    .map((a) => ({ id: a.id, businessSlug: a.businesses!.slug, headline: a.headline, body: a.body ?? undefined, cta: a.cta, color: a.color, photo: a.image_url ?? undefined }));
  OPENING_ADS.splice(0, OPENING_ADS.length, ...ads);
}
