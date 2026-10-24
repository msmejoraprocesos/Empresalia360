import { useFocusEffect } from 'expo-router';
import { useCallback, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import type { EventKind, Source, StatEvent } from '@/data/stats';
import type { Business } from '@/data/types';

import { supabase } from './supabase';

/**
 * Registro anónimo de lo que pasa en la página de cada negocio.
 * - Cada teléfono tiene un identificador aleatorio (no se guarda nombre, teléfono ni ubicación).
 * - Los eventos se mandan a Supabase (tabla business_events) en grupos cada pocos segundos.
 * - También se guardan los últimos en este teléfono para que el tablero refleje tus pruebas.
 */

const DEVICE_KEY = 'expertalia360.device';
const LOG_KEY = 'expertalia360.events';
const MAX_LOCAL = 800;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function storage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function randomId() {
  return Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 8)).join('');
}

let deviceId: string | undefined;
export function visitorId(): string {
  if (deviceId) return deviceId;
  try {
    deviceId = storage()?.getItem(DEVICE_KEY) ?? undefined;
    if (!deviceId) {
      deviceId = randomId();
      storage()?.setItem(DEVICE_KEY, deviceId);
    }
  } catch {
    deviceId = deviceId ?? randomId();
  }
  return deviceId;
}

// ── Historial local (para el tablero de prueba) ─────────────────
let local: StatEvent[] = (() => {
  try {
    const raw = storage()?.getItem(LOG_KEY);
    return raw ? (JSON.parse(raw) as StatEvent[]) : [];
  } catch {
    return [];
  }
})();
const listeners = new Set<() => void>();

function saveLocal() {
  try {
    storage()?.setItem(LOG_KEY, JSON.stringify(local.slice(-MAX_LOCAL)));
  } catch {
    // sin almacenamiento disponible: el historial vive solo en memoria
  }
}

export function useLocalEvents(): StatEvent[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => local,
  );
}

// ── Envío a Supabase ───────────────────────────────────────────
type Row = {
  business_id: string;
  kind: EventKind;
  visitor_id: string;
  item_id: string | null;
  duration_ms: number | null;
  screen: string | null;
  source: string | null;
};
let queue: Row[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;

async function flush() {
  timer = undefined;
  if (!supabase || queue.length === 0) return;
  const batch = queue.splice(0, 50);
  const { error } = await supabase.from('business_events').insert(batch);
  if (error && __DEV__) console.warn('[estadísticas] no se pudieron enviar eventos:', error.message);
  if (queue.length) schedule();
}

function schedule() {
  if (!timer) timer = setTimeout(flush, 4000);
}

AppState.addEventListener('change', (s) => {
  if (s !== 'active') flush();
});

// ── API ────────────────────────────────────────────────────────
export function track(
  business: Pick<Business, 'id' | 'slug'> | undefined,
  kind: EventKind,
  extra: { itemId?: string; durationMs?: number; screen?: string; source?: string } = {},
) {
  if (!business) return;
  const event: StatEvent = { slug: business.slug, kind, visitor: visitorId(), at: Date.now(), ...extra };
  local = [...local.slice(-(MAX_LOCAL - 1)), event];
  saveLocal();
  listeners.forEach((l) => l());

  // Solo negocios que vienen de Supabase tienen id real
  if (supabase && UUID.test(business.id)) {
    queue.push({
      business_id: business.id,
      kind,
      visitor_id: event.visitor,
      item_id: extra.itemId && UUID.test(extra.itemId) ? extra.itemId : null,
      duration_ms: extra.durationMs ?? null,
      screen: extra.screen ?? null,
      source: extra.source ?? null,
    });
    schedule();
  }
}

// De dónde llegó la persona a la página del negocio (se marca antes de navegar)
let nextSource: Source | undefined;
export function markSource(source: Source) {
  nextSource = source;
}
function takeSource(): Source {
  const s = nextSource ?? 'otro';
  nextSource = undefined;
  return s;
}

/**
 * Para las pantallas de un negocio: registra la vista al entrar y el tiempo
 * que la persona se queda (se pausa si sale de la app).
 */
export function useBusinessScreen(business: Pick<Business, 'id' | 'slug'> | undefined, screen: string, kind?: EventKind, source?: Source) {
  const id = business?.id;
  const slug = business?.slug;
  useFocusEffect(
    useCallback(() => {
      if (!id || !slug) return;
      const biz = { id, slug };
      if (kind) track(biz, kind, kind === 'vista_perfil' ? { source: source ?? takeSource() } : {});
      let start = Date.now();
      const emit = () => {
        const ms = Date.now() - start;
        if (ms >= 1000) track(biz, 'tiempo', { durationMs: Math.min(ms, 1800000), screen });
      };
      const sub = AppState.addEventListener('change', (s) => {
        if (s === 'active') start = Date.now();
        else emit();
      });
      return () => {
        sub.remove();
        if (AppState.currentState === 'active') emit();
      };
    }, [id, slug, screen, kind, source]),
  );
}
