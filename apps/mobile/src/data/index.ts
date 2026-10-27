import { BUSINESSES, CATEGORIES, ZONE } from './mock';
import type { Attend, Business, Category, Module } from './types';
import { metersBetween } from '@/lib/format';

export * from './mock';

/**
 * Perfiles ocultos por falta de pago (suspendidos). No salen en búsquedas, categorías ni mapa,
 * pero su página directa y su panel siguen funcionando. Con Supabase, la base ya no los manda.
 */
export const HIDDEN = new Set<string>();
export const isListed = (b: Business) => !HIDDEN.has(b.slug);

/**
 * Nivel de cada perfil (se llena con las mensualidades). Premium sale antes en búsquedas y categorías;
 * VIP sale primero en su especialidad. Dentro del mismo nivel manda la calificación.
 */
export const PLAN_OF: Record<string, 'estandar' | 'premium' | 'vip'> = {};
export const planRank = (b: Business) => ({ vip: 2, premium: 1, estandar: 0 })[PLAN_OF[b.slug] ?? 'estandar'];

export function getBusiness(slug: string | undefined): Business | undefined {
  return BUSINESSES.find((b) => b.slug === slug);
}

/** Todas las categorías del experto: la principal primero, luego las demás */
export function categoriesOf(b: Business): string[] {
  // Las extra siempre son del mismo mundo que la principal (los mundos no se mezclan)
  const world = CATEGORIES.find((c) => c.slug === b.categorySlug)?.group;
  const extras = (b.categorySlugs ?? []).filter((s) => CATEGORIES.find((c) => c.slug === s)?.group === world);
  return Array.from(new Set([b.categorySlug, ...extras]));
}

export const inCategory = (b: Business, slug: string) => categoriesOf(b).includes(slug);

/** ¿Aparece en este mundo? (un experto puede estar en los dos si tiene categorías de ambos) */
export function inWorld(b: Business | undefined, world: 'profesionales' | 'oficios'): boolean {
  return Boolean(b && categoriesOf(b).some((s) => CATEGORIES.find((c) => c.slug === s)?.group === world));
}

/** La categoría con la que se muestra en un mundo (o la elegida en un filtro) */
export function categoryFor(b: Business, world?: 'profesionales' | 'oficios', preferred?: string | null): Category | undefined {
  const cats = categoriesOf(b).map((s) => CATEGORIES.find((c) => c.slug === s)).filter((c): c is Category => Boolean(c));
  return (preferred && cats.find((c) => c.slug === preferred)) || (world && cats.find((c) => c.group === world)) || cats[0];
}

/** Categoría a la que pertenece una especialidad (las que el experto escribe a mano no tienen) */
export function specialtyCategory(name: string): string | undefined {
  return CATEGORIES.find((c) => c.specialties.some((s) => s.name === name))?.slug;
}

/** Especialidades que se muestran en un mundo: las de sus categorías de ese mundo y las escritas a mano */
export function specialtiesIn(b: Business, world?: 'profesionales' | 'oficios'): string[] {
  if (!world) return b.specialties;
  return b.specialties.filter((s) => {
    const c = specialtyCategory(s);
    return !c || CATEGORIES.find((x) => x.slug === c)?.group === world;
  });
}

export function businessesInCategory(slug: string): Business[] {
  return BUSINESSES.filter((b) => isListed(b) && inCategory(b, slug)).sort((a, b) => planRank(b) - planRank(a) || b.rating - a.rating);
}

export const ATTEND_LABEL: Record<Attend, string> = {
  despacho: 'En despacho',
  en_linea: 'En línea',
  domicilio: 'A domicilio',
};

export const ATTEND_ICON: Record<Attend, 'business-outline' | 'videocam-outline' | 'home-outline'> = {
  despacho: 'business-outline',
  en_linea: 'videocam-outline',
  domicilio: 'home-outline',
};

const norm = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

/** Especialidades que coinciden con lo que escribe el cliente, por nombre o por palabras del problema. */
export function specialtiesFor(q: string): { category: Category; specialty: string }[] {
  const t = norm(q);
  if (t.length < 3) return [];
  const out: { category: Category; specialty: string }[] = [];
  for (const c of CATEGORIES) {
    for (const s of c.specialties) {
      if (norm(s.name).includes(t) || s.keywords.some((k) => norm(k).includes(t) || t.includes(norm(k)))) out.push({ category: c, specialty: s.name });
    }
  }
  return out;
}

export type SearchFilters = {
  category?: string;
  specialty?: string;
  attend?: Attend;
  verified?: boolean;
  freeConsult?: boolean;
  sort?: 'relevancia' | 'calificacion' | 'resenas' | 'cercania';
};

/** Busca profesionales por nombre, profesión, especialidad o por el problema que describe el cliente. */
export function searchProfessionals(q: string, f: SearchFilters = {}): Business[] {
  const t = norm(q);
  const matchedSpecialties = new Set(specialtiesFor(q).map((m) => m.specialty));
  let list = BUSINESSES.filter((b) => {
    if (!isListed(b)) return false;
    if (f.category && !inCategory(b, f.category)) return false;
    if (f.specialty && !b.specialties.includes(f.specialty)) return false;
    if (f.attend && !b.attends.includes(f.attend)) return false;
    if (f.verified && !b.verified) return false;
    if (f.freeConsult && b.consultPrice !== 0) return false;
    if (!t) return true;
    const cats = CATEGORIES.filter((c) => inCategory(b, c.slug));
    return (
      norm(b.name).includes(t) ||
      norm(b.profession).includes(t) ||
      norm(b.description).includes(t) ||
      cats.some((cat) => norm(cat.name).includes(t) || norm(cat.professional).includes(t)) ||
      b.specialties.some((s) => matchedSpecialties.has(s) || norm(s).includes(t)) ||
      b.items.some((i) => norm(i.name).includes(t))
    );
  });
  const sort = f.sort ?? 'relevancia';
  list = [...list].sort((a, b) => {
    if (sort === 'cercania') return distanceTo(a) - distanceTo(b);
    if (sort === 'resenas') return b.ratingCount - a.ratingCount;
    if (sort === 'calificacion') return b.rating - a.rating || b.ratingCount - a.ratingCount;
    // relevancia: verificados, mejor calificados y con más reseñas
    // Premium y VIP salen antes (lo que pagan); luego verificados, mejor calificados y con más reseñas
    const score = (x: Business) => x.rating * 10 + Math.log10(x.ratingCount + 1) * 4 + (x.verified ? 3 : 0) + (x.isOpen ? 1 : 0);
    return planRank(b) - planRank(a) || score(b) - score(a);
  });
  return list;
}

/** Compatibilidad con pantallas anteriores */
export function searchBusinesses(q: string): Business[] {
  return q.trim() ? searchProfessionals(q) : [];
}

export function distanceTo(b: Business): number {
  return metersBetween(ZONE.lat, ZONE.lng, b.lat, b.lng);
}

export function countInCategory(slug: string): number {
  return BUSINESSES.filter((b) => isListed(b) && inCategory(b, slug)).length;
}

/** Acción principal del perfil según lo que ofrece el profesional. */
export function primaryAction(b: Business): { module: Module; label: string } {
  if (b.modules.includes('reservar')) return { module: 'reservar', label: b.attends.includes('domicilio') && !b.attends.includes('despacho') ? 'Agendar visita' : 'Agendar cita' };
  return { module: 'cotizar', label: 'Pedir cotización' };
}

export function categoryName(slug: string): string {
  return CATEGORIES.find((c) => c.slug === slug)?.name ?? '';
}

export function initials(name: string): string {
  const words = name.replace(/^(Lic|C\.P|Psic|Arq|Ing|Dr|Dra)\.?\s+/i, '').split(/\s+/).filter(Boolean);
  return (words[0]?.[0] ?? '') + (words[1]?.[0] ?? '');
}

/** Qué tan completo está un perfil (0 a 100) y qué le falta. */
export function profileCompleteness(b: Business): { percent: number; missing: string[] } {
  const checks: [boolean, string][] = [
    [b.specialties.length > 0, 'Especialidades'],
    [b.description.length > 60, 'Descripción de al menos dos líneas'],
    [Boolean(b.license), 'Cédula o certificación'],
    [Boolean(b.education), 'Formación'],
    [b.items.length >= 2, 'Al menos dos servicios'],
    [b.attends.length > 0, 'Dónde atiendes'],
    [b.consultPrice !== undefined, 'Precio de consulta o visita'],
    [b.reviews.length >= 3, 'Tres reseñas de clientes'],
  ];
  const done = checks.filter(([ok]) => ok).length;
  return { percent: Math.round((done / checks.length) * 100), missing: checks.filter(([ok]) => !ok).map(([, m]) => m) };
}
