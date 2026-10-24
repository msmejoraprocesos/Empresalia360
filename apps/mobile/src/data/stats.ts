import { OPENING_ADS } from './ads';
import type { Business } from './types';

/** Lo que la app registra cuando alguien mira un negocio (ver supabase/migrations/…_estadisticas.sql). */
export type EventKind =
  | 'vista_perfil'
  | 'vista_catalogo'
  | 'seleccion'
  | 'vista_resenas'
  | 'contacto'
  | 'como_llegar'
  | 'compartir'
  | 'favorito'
  | 'pedido'
  | 'reserva'
  | 'cotizacion'
  | 'tiempo'
  | 'anuncio_visto'
  | 'anuncio_toque';

export type Source = 'anuncio' | 'inicio' | 'buscar' | 'categoria' | 'mapa' | 'promocion' | 'mini_sitio' | 'favoritos' | 'pedidos' | 'otro';

export const SOURCE_LABEL: Record<string, string> = {
  anuncio: 'Anuncio al abrir la app',
  inicio: 'Inicio de la app',
  buscar: 'Búsqueda',
  categoria: 'Categoría',
  mapa: 'Mapa',
  promocion: 'Promociones',
  mini_sitio: 'Tu liga o QR',
  favoritos: 'Favoritos',
  pedidos: 'Pedir de nuevo',
  otro: 'Otros',
};

export type StatEvent = {
  slug: string;
  kind: EventKind;
  visitor: string;
  at: number;
  itemId?: string;
  durationMs?: number;
  source?: string;
};

/** Misma forma que devuelve la función business_stats() de Supabase. */
export type Stats = {
  days: number;
  visitors: number;
  prevVisitors: number;
  views: number;
  avgSeconds: number;
  engaged: number;
  dwell: { lt10: number; s10to30: number; s30to60: number; gt60: number };
  funnel: { visitors: number; catalog: number; selected: number; converted: number };
  reviews: number;
  contacts: number;
  directions: number;
  shares: number;
  favorites: number;
  orders: number;
  bookings: number;
  quotes: number;
  /** Personas que vieron / tocaron tu anuncio al abrir la app */
  adViews: number;
  adTaps: number;
  series: { label: string; visitors: number }[];
  hours: number[];
  topItems: { itemId: string; selections: number }[];
  sources: { source: string; visitors: number }[];
};

const DAY = 86400000;

function startOfDay(t: number) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dayKey(t: number) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const distinct = (list: StatEvent[]) => new Set(list.map((e) => e.visitor)).size;

/** Calcula los indicadores de un periodo (1 = hoy, 7 o 30 días). */
export function computeStats(events: StatEvent[], days: number, now = Date.now()): Stats {
  const today = startOfDay(now);
  const from = today - (days - 1) * DAY;
  const prevFrom = today - (2 * days - 1) * DAY;
  const inPeriod = events.filter((e) => e.at >= from && e.at <= now);
  // Los anuncios al abrir la app se cuentan aparte: verlos no es visitar el negocio
  const isAd = (e: StatEvent) => e.kind === 'anuncio_visto' || e.kind === 'anuncio_toque';
  const cur = inPeriod.filter((e) => !isAd(e));
  // El periodo anterior se compara hasta el mismo momento (hoy a las 3 pm contra ayer a las 3 pm)
  const prev = events.filter((e) => e.at >= prevFrom && e.at < from && e.at <= now - days * DAY && !isAd(e));
  const of = (...kinds: EventKind[]) => cur.filter((e) => kinds.includes(e.kind));

  // Una visita = una persona en un día; su tiempo es la suma de lo que estuvo en las pantallas del negocio
  const visits = new Map<string, number>();
  for (const e of cur) {
    const k = `${e.visitor}|${dayKey(e.at)}`;
    visits.set(k, (visits.get(k) ?? 0) + (e.kind === 'tiempo' ? e.durationMs ?? 0 : 0));
  }
  const ms = [...visits.values()];
  const timed = ms.filter((m) => m > 0);

  const seriesMap = new Map<string, Set<string>>();
  for (const e of cur) {
    const label = days === 1 ? String(new Date(e.at).getHours()) : dayKey(e.at);
    if (!seriesMap.has(label)) seriesMap.set(label, new Set());
    seriesMap.get(label)!.add(e.visitor);
  }

  const hours = Array.from({ length: 24 }, () => 0);
  for (const e of of('vista_perfil')) hours[new Date(e.at).getHours()]++;

  const items = new Map<string, number>();
  for (const e of of('seleccion')) if (e.itemId) items.set(e.itemId, (items.get(e.itemId) ?? 0) + 1);

  const sources = new Map<string, Set<string>>();
  for (const e of of('vista_perfil')) {
    const s = e.source ?? 'otro';
    if (!sources.has(s)) sources.set(s, new Set());
    sources.get(s)!.add(e.visitor);
  }

  return {
    days,
    visitors: distinct(cur),
    prevVisitors: distinct(prev),
    views: of('vista_perfil').length,
    avgSeconds: timed.length ? Math.round(timed.reduce((a, b) => a + b, 0) / timed.length / 1000) : 0,
    engaged: ms.filter((m) => m >= 10000).length,
    dwell: {
      lt10: ms.filter((m) => m < 10000).length,
      s10to30: ms.filter((m) => m >= 10000 && m < 30000).length,
      s30to60: ms.filter((m) => m >= 30000 && m < 60000).length,
      gt60: ms.filter((m) => m >= 60000).length,
    },
    funnel: {
      visitors: distinct(cur),
      catalog: distinct(of('vista_catalogo', 'seleccion')),
      selected: distinct(of('seleccion')),
      converted: distinct(of('pedido', 'reserva', 'cotizacion')),
    },
    reviews: distinct(of('vista_resenas')),
    contacts: of('contacto').length,
    directions: of('como_llegar').length,
    shares: of('compartir').length,
    favorites: of('favorito').length,
    orders: of('pedido').length,
    bookings: of('reserva').length,
    quotes: of('cotizacion').length,
    adViews: distinct(inPeriod.filter((e) => e.kind === 'anuncio_visto')),
    adTaps: distinct(inPeriod.filter((e) => e.kind === 'anuncio_toque')),
    series: [...seriesMap.entries()].map(([label, v]) => ({ label, visitors: v.size })).sort((a, b) => a.label.localeCompare(b.label)),
    hours,
    topItems: [...items.entries()].map(([itemId, selections]) => ({ itemId, selections })).sort((a, b) => b.selections - a.selections).slice(0, 5),
    sources: [...sources.entries()].map(([source, v]) => ({ source, visitors: v.size })).sort((a, b) => b.visitors - a.visitors),
  };
}

/**
 * Serie completa para la gráfica: rellena con ceros los días (u horas, si es "hoy")
 * en que nadie entró, para que la gráfica no se salte huecos.
 */
export function fullSeries(stats: Stats, now = Date.now()): { key: string; label: string; visitors: number }[] {
  const byLabel = new Map(stats.series.map((s) => [s.label, s.visitors]));
  if (stats.days === 1) {
    const hourNow = new Date(now).getHours();
    return Array.from({ length: 24 }, (_, h) => ({
      key: String(h),
      label: `${h}`,
      visitors: h <= hourNow ? byLabel.get(String(h)) ?? 0 : 0,
    }));
  }
  const today = startOfDay(now);
  const letters = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  return Array.from({ length: stats.days }, (_, i) => {
    const t = today - (stats.days - 1 - i) * DAY;
    const d = new Date(t);
    return {
      key: dayKey(t),
      label: stats.days <= 7 ? letters[d.getDay()] : String(d.getDate()),
      visitors: byLabel.get(dayKey(t)) ?? 0,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// Historial de ejemplo: mientras no haya inicio de sesión para el dueño,
// el tablero muestra 60 días simulados (siempre los mismos para cada negocio)
// más las visitas reales que se hagan desde este teléfono.
// ─────────────────────────────────────────────────────────────
function seeded(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, weighted: [T, number][]): T {
  const total = weighted.reduce((a, [, w]) => a + w, 0);
  let r = rand() * total;
  for (const [v, w] of weighted) {
    r -= w;
    if (r <= 0) return v;
  }
  return weighted[weighted.length - 1][0];
}

const HOUR_WEIGHTS: [number, number][] = [
  [7, 3], [8, 6], [9, 7], [10, 5], [11, 4], [12, 5], [13, 7], [14, 7], [15, 4],
  [16, 4], [17, 5], [18, 7], [19, 8], [20, 7], [21, 4], [22, 2],
];

const SOURCE_WEIGHTS: [Source, number][] = [
  ['inicio', 30], ['buscar', 22], ['mapa', 18], ['categoria', 14], ['promocion', 8], ['mini_sitio', 5], ['favoritos', 3],
];

const sampleCache = new Map<string, StatEvent[]>();

export function sampleEvents(b: Business, now = Date.now()): StatEvent[] {
  const today = startOfDay(now);
  const cacheKey = `${b.slug}|${today}`;
  const hit = sampleCache.get(cacheKey);
  if (hit) return hit.filter((e) => e.at <= now);

  const rand = seeded(b.slug);
  const base = 14 + Math.min(30, b.ratingCount / 6);
  const pool = Math.round(base * 9);
  const conversion = b.modules.includes('ordenar') ? 'pedido' : b.modules.includes('reservar') ? 'reserva' : 'cotizacion';
  const selectable = b.items.filter((i) => i.available);
  const events: StatEvent[] = [];
  const hasAd = OPENING_ADS.some((a) => a.businessSlug === b.slug);

  for (let d = 59; d >= 0; d--) {
    const dayStart = today - d * DAY;
    const weekday = new Date(dayStart).getDay();
    const weekFactor = [1.2, 0.8, 0.85, 0.9, 1, 1.35, 1.45][weekday];
    const growth = 0.8 + ((59 - d) / 59) * 0.35;
    const count = Math.round(base * weekFactor * growth * (0.85 + rand() * 0.3));

    // Si el negocio tiene anuncio al abrir la app (últimos 30 días): muchos lo ven, algunos lo tocan y entran
    if (hasAd && d < 30) {
      const seen = Math.round(base * 5 * weekFactor * (0.85 + rand() * 0.3));
      for (let v = 0; v < seen; v++) {
        const visitor = `ej-ad-${Math.floor(rand() * pool * 4)}`;
        const at = dayStart + pick(rand, HOUR_WEIGHTS) * 3600000 + Math.floor(rand() * 3600000);
        events.push({ slug: b.slug, kind: 'anuncio_visto', visitor, at });
        if (rand() < 0.02) {
          events.push({ slug: b.slug, kind: 'anuncio_toque', visitor, at: at + 4000 });
          events.push({ slug: b.slug, kind: 'vista_perfil', visitor, at: at + 5000, source: 'anuncio' });
          events.push({ slug: b.slug, kind: 'tiempo', visitor, at: at + 6000, durationMs: Math.round((8 + rand() * 60) * 1000) });
        }
      }
    }
    for (let v = 0; v < count; v++) {
      const visitor = `ej-${Math.floor(rand() * pool)}`;
      const at = dayStart + pick(rand, HOUR_WEIGHTS) * 3600000 + Math.floor(rand() * 3600000);
      const add = (kind: EventKind, extra: Partial<StatEvent> = {}, offset = 0) =>
        events.push({ slug: b.slug, kind, visitor, at: at + offset, ...extra });

      add('vista_perfil', { source: pick(rand, SOURCE_WEIGHTS) });
      const r = rand();
      const seconds = r < 0.34 ? 2 + rand() * 7 : r < 0.64 ? 10 + rand() * 19 : r < 0.84 ? 30 + rand() * 29 : 60 + rand() * 180;
      add('tiempo', { durationMs: Math.round(seconds * 1000) }, 1000);
      if (seconds < 10) continue;
      if (rand() < 0.3) add('vista_resenas', {}, 2000);
      if (rand() < 0.07) add('contacto', {}, 3000);
      if (rand() < 0.05) add('como_llegar', {}, 3000);
      if (rand() < 0.03) add('favorito', {}, 3000);
      if (rand() < 0.02) add('compartir', {}, 3000);
      if (rand() < 0.62) {
        add('vista_catalogo', {}, 4000);
        if (selectable.length && rand() < 0.55) {
          // Los primeros productos del menú se eligen más
          const idx = Math.min(selectable.length - 1, Math.floor(Math.pow(rand(), 1.8) * selectable.length));
          add('seleccion', { itemId: selectable[idx].id }, 5000);
          if (rand() < 0.48) add(conversion, {}, 6000);
        }
      }
    }
  }
  sampleCache.set(cacheKey, events);
  return events.filter((e) => e.at <= now);
}
