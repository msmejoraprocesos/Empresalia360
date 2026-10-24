import { useEffect, useMemo, useState } from 'react';

import { computeStats, sampleEvents, type Stats } from '@/data/stats';
import type { Business } from '@/data/types';
import { useLocalEvents } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';

export type StatsSource = 'en_vivo' | 'ejemplo';

/**
 * Indicadores del negocio para el periodo elegido.
 * 1. Si el dueño (o el admin) tiene sesión en Supabase, vienen de business_stats(): datos reales.
 * 2. Si no, se calcula con un historial de ejemplo más las visitas hechas desde este teléfono,
 *    para que puedas probarlo: entra como vecino a tu negocio y el tablero se mueve.
 */
export function useBusinessStats(business: Business | undefined, days: number) {
  const localEvents = useLocalEvents();
  const [remote, setRemote] = useState<{ key: string; stats: Stats } | null>(null);
  const key = `${business?.slug}|${days}`;

  useEffect(() => {
    if (!supabase || !business) return;
    let cancelled = false;
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return; // sin sesión la función no responde: se usa el ejemplo
      const { data, error } = await supabase.rpc('business_stats', { p_slug: business.slug, p_days: days });
      if (!cancelled && !error && data) setRemote({ key, stats: data as Stats });
    })();
    return () => {
      cancelled = true;
    };
  }, [business, days, key]);

  const sample = useMemo(() => {
    if (!business) return undefined;
    const mine = localEvents.filter((e) => e.slug === business.slug);
    return computeStats([...sampleEvents(business), ...mine], days);
  }, [business, days, localEvents]);

  if (remote && remote.key === key) return { stats: remote.stats, source: 'en_vivo' as StatsSource };
  return { stats: sample, source: 'ejemplo' as StatsSource };
}
