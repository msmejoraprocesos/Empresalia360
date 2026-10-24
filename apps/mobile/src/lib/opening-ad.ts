import { getBusiness } from '@/data';
import { OPENING_AD, type OpeningAd } from '@/data/ads';

/**
 * Qué anuncio mostrar al abrir la app.
 * - Cada marca le aparece a cada persona como máximo una vez cada 3 horas.
 * - Se reparten por turnos: primero el que hace más tiempo que no ves.
 * - Nunca más de uno por apertura, y no se repite si vuelves a la app en menos de 10 minutos.
 */
const SEEN_KEY = 'expertalia360.adSeen';
const LAST_KEY = 'expertalia360.adLast';
const MIN_GAP_MS = 10 * 60 * 1000;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
  } catch {
    // sin almacenamiento: el control vive solo mientras la app esté abierta
  }
}

const memory: { seen: Record<string, number>; last: number } = { seen: read(SEEN_KEY, {}), last: read(LAST_KEY, 0) };

export function pickOpeningAd(ads: OpeningAd[], now = Date.now()): OpeningAd | undefined {
  if (now - memory.last < MIN_GAP_MS) return undefined;
  const repeat = OPENING_AD.repeatHours * 3600 * 1000;
  return ads
    .filter((a) => getBusiness(a.businessSlug) && now - (memory.seen[a.id] ?? 0) >= repeat)
    .sort((a, b) => (memory.seen[a.id] ?? 0) - (memory.seen[b.id] ?? 0))[0];
}

export function markAdSeen(id: string, now = Date.now()) {
  memory.seen = { ...memory.seen, [id]: now };
  memory.last = now;
  write(SEEN_KEY, memory.seen);
  write(LAST_KEY, now);
}
