import { BUSINESSES, CATEGORIES, ZONE } from './mock';
import type { Business, Module } from './types';
import { metersBetween } from '@/lib/format';

export * from './mock';

export function getBusiness(slug: string | undefined): Business | undefined {
  return BUSINESSES.find((b) => b.slug === slug);
}

export function businessesInCategory(slug: string): Business[] {
  return BUSINESSES.filter((b) => b.categorySlug === slug);
}

export function searchBusinesses(q: string): Business[] {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  return BUSINESSES.filter(
    (b) =>
      b.name.toLowerCase().includes(t) ||
      b.subtitle.toLowerCase().includes(t) ||
      b.description.toLowerCase().includes(t) ||
      b.items.some((i) => i.name.toLowerCase().includes(t)),
  );
}

export function distanceTo(b: Business): number {
  return metersBetween(ZONE.lat, ZONE.lng, b.lat, b.lng);
}

export function countInCategory(slug: string): number {
  return BUSINESSES.filter((b) => b.categorySlug === slug).length;
}

/** Acción principal del perfil según los módulos del negocio. */
export function primaryAction(b: Business): { module: Module; label: string } {
  if (b.modules.includes('ordenar')) return { module: 'ordenar', label: 'Ver servicios y contratar' };
  if (b.modules.includes('reservar')) return { module: 'reservar', label: 'Agendar cita' };
  return { module: 'cotizar', label: 'Pedir cotización' };
}

export function categoryName(slug: string): string {
  return CATEGORIES.find((c) => c.slug === slug)?.name ?? '';
}
