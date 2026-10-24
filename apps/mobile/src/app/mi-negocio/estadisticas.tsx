import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BarRow, ColumnChart } from '@/components/charts';
import { Card, EmptyState, Header, Segmented } from '@/components/ui';
import { Brand, Radius, ShadowStrong } from '@/constants/theme';
import { getBusiness } from '@/data';
import { fullSeries, SOURCE_LABEL, type Stats } from '@/data/stats';
import type { Business, IconName } from '@/data/types';
import { useBusinessStats } from '@/hooks/use-business-stats';
import { myBusiness } from '@/store/app';

type Period = '1' | '7' | '30';

const PERIOD_TEXT: Record<Period, { now: string; prev: string }> = {
  '1': { now: 'hoy', prev: 'ayer a esta hora' },
  '7': { now: 'en 7 días', prev: 'los 7 días anteriores' },
  '30': { now: 'en 30 días', prev: 'los 30 días anteriores' },
};

const n = (v: number) => v.toLocaleString('es-MX');
const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);
const plural = (v: number, one: string, many: string) => `${n(v)} ${v === 1 ? one : many}`;

function duration(seconds: number) {
  if (seconds < 60) return `${seconds} s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m} min ${s} s` : `${m} min`;
}

function conversionLabel(b: Business) {
  if (b.modules.includes('ordenar')) return { verb: 'Contrataron', noun: 'contrataciones' };
  if (b.modules.includes('reservar')) return { verb: 'Reservaron una cita', noun: 'citas' };
  return { verb: 'Pidieron cotización', noun: 'cotizaciones' };
}

/** Sugerencias automáticas a partir de los números. */
function tips(s: Stats, b: Business): string[] {
  const out: string[] = [];
  const f = s.funnel;
  if (f.visitors >= 10 && pct(f.catalog, f.visitors) < 45)
    out.push('Muchos entran pero pocos abren tus servicios. Pon una foto y una promoción en tu página para invitarlos a ver más.');
  if (f.selected >= 5 && pct(f.converted, f.selected) < 40)
    out.push('Varios eligen un producto y no terminan. Revisa precios, tiempos de entrega o agrega un beneficio por primera compra.');
  if (pct(s.reviews, f.visitors) >= 25)
    out.push(`Tus reseñas se leen mucho (${pct(s.reviews, f.visitors)}% de quienes entran). Responder cada una da confianza.`);
  const peak = s.hours.indexOf(Math.max(...s.hours));
  if (Math.max(...s.hours) > 0) out.push(`Tu hora con más visitas es de ${peak} a ${peak + 1} h. Ahí conviene lanzar promociones relámpago.`);
  if (s.prevVisitors > 0 && s.visitors < s.prevVisitors)
    out.push('Bajaron tus visitas. Un espacio preferencial en tu zona te pone primero en el inicio de tus futuros clientes.');
  if (!b.promo) out.push('No tienes promoción activa: los negocios con promoción aparecen en "Tus promociones" de cada cliente.');
  return out.slice(0, 3);
}

export default function Estadisticas() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const business = slug ? getBusiness(slug) : myBusiness;
  const [period, setPeriod] = useState<Period>('7');
  const [picked, setPicked] = useState<string>();
  const { stats, source } = useBusinessStats(business, Number(period));

  if (!business || !stats) return <EmptyState icon="stats-chart-outline" title="Negocio no encontrado" text="" />;

  const t = PERIOD_TEXT[period];
  const conv = conversionLabel(business);
  const visits = stats.dwell.lt10 + stats.dwell.s10to30 + stats.dwell.s30to60 + stats.dwell.gt60;
  const change = stats.prevVisitors > 0 ? Math.round(((stats.visitors - stats.prevVisitors) / stats.prevVisitors) * 100) : null;

  let series = fullSeries(stats);
  if (period === '1') {
    const hourNow = new Date().getHours();
    series = series.slice(7, 23).map((c) => ({ ...c, muted: Number(c.key) > hourNow }));
  }
  const columns = series.map((c) => ({
    key: c.key,
    label: c.label,
    value: c.visitors,
    muted: 'muted' in c ? (c.muted as boolean) : false,
  }));
  const selectedKey = picked && columns.some((c) => c.key === picked) ? picked : undefined;
  const describe = (c: { key: string; value: number }) => {
    if (period === '1') return `${c.key}:00 h · ${plural(c.value, 'persona', 'personas')}`;
    const d = new Date(`${c.key}T12:00:00`);
    const label = d.toLocaleDateString('es-MX', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    return `${label} · ${plural(c.value, 'persona', 'personas')}`;
  };

  const itemName = (id: string) => business.items.find((i) => i.id === id)?.name ?? 'Producto';
  const maxItem = Math.max(1, ...stats.topItems.map((i) => i.selections));
  const maxSource = Math.max(1, ...stats.sources.map((s) => s.visitors));
  const hoursSlice = stats.hours.slice(7, 23).map((v, i) => ({ key: String(i + 7), label: String(i + 7), value: v }));
  const peak = stats.hours.indexOf(Math.max(...stats.hours));
  const advice = tips(stats, business);

  const kpis: {
    icon: IconName;
    bg: string;
    fg: string;
    value: string;
    label: string;
    sub?: string;
  }[] = [
    {
      icon: 'time-outline',
      bg: Brand.albercaSoft,
      fg: '#1757B8',
      value: duration(stats.avgSeconds),
      label: 'Tiempo promedio',
      sub: 'en tu página',
    },
    {
      icon: 'eye-outline',
      bg: Brand.chileSoft,
      fg: Brand.chileDark,
      value: n(stats.views),
      label: 'Veces que abrieron',
      sub: 'tu página',
    },
    {
      icon: 'star-outline',
      bg: Brand.mangoSoft,
      fg: '#7A5600',
      value: n(stats.reviews),
      label: 'Leyeron tus reseñas',
      sub: `${pct(stats.reviews, stats.visitors)}% de quienes entran`,
    },
    {
      icon: 'chatbubbles-outline',
      bg: Brand.nopalSoft,
      fg: Brand.nopalDark,
      value: n(stats.contacts + stats.directions),
      label: 'Te contactaron',
      sub: `${n(stats.contacts)} WhatsApp · ${n(stats.directions)} cómo llegar`,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Header title="Estadísticas" subtitle={business.name} color={Brand.ink} extraBottom={40}>
          <View style={{ marginTop: 14 }}>
            <Segmented
              dark
              value={period}
              onChange={(p) => {
                setPeriod(p);
                setPicked(undefined);
              }}
              options={[
                { value: '1', label: 'Hoy' },
                { value: '7', label: '7 días' },
                { value: '30', label: '30 días' },
              ]}
            />
          </View>
        </Header>
        <View style={{ paddingHorizontal: 16, gap: 14 }}>
          {/* Titular */}
          <Card strong style={styles.hero}>
            <Text style={styles.heroLabel}>Personas que vieron tu negocio {t.now}</Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                gap: 10,
                flexWrap: 'wrap',
              }}>
              <Text style={styles.heroValue}>{n(stats.visitors)}</Text>
              {change !== null ? (
                <View
                  style={[
                    styles.delta,
                    {
                      backgroundColor: change >= 0 ? Brand.nopalSoft : Brand.chileSoft,
                    },
                  ]}>
                  <Ionicons name={change >= 0 ? 'arrow-up' : 'arrow-down'} size={14} color={change >= 0 ? Brand.nopalDark : Brand.chileDark} />
                  <Text
                    style={[
                      styles.deltaText,
                      {
                        color: change >= 0 ? Brand.nopalDark : Brand.chileDark,
                      },
                    ]}>
                    {Math.abs(change)}% vs. {t.prev}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.engagedRow}>
              <Ionicons name="hourglass-outline" size={18} color={Brand.ink} />
              <Text style={styles.engagedText}>
                <Text style={{ fontWeight: '800' }}>{plural(stats.engaged, 'visita', 'visitas')}</Text> se detuvieron más de 10 segundos a ver tu negocio
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${pct(stats.engaged, visits)}%` }]} />
            </View>
            <Text style={styles.muted}>{pct(stats.engaged, visits)}% de las visitas</Text>
          </Card>

          {/* Visitas en el tiempo */}
          <Card>
            <Text style={styles.cardTitle}>{period === '1' ? 'Personas por hora, hoy' : 'Personas por día'}</Text>
            <ColumnChart
              data={columns}
              selected={selectedKey}
              onSelect={setPicked}
              labelEvery={period === '30' ? 5 : period === '1' ? 3 : 1}
              describe={describe}
            />
          </Card>

          {/* Indicadores */}
          <View style={styles.grid}>
            {kpis.map((k) => (
              <View key={k.label} style={styles.kpi} accessible accessibilityLabel={`${k.label}: ${k.value}. ${k.sub ?? ''}`}>
                <View style={[styles.kpiIcon, { backgroundColor: k.bg }]}>
                  <Ionicons name={k.icon} size={20} color={k.fg} />
                </View>
                <Text style={styles.kpiValue}>{k.value}</Text>
                <Text style={styles.kpiLabel}>{k.label}</Text>
                {k.sub ? <Text style={styles.kpiSub}>{k.sub}</Text> : null}
              </View>
            ))}
          </View>

          {/* Anuncio al abrir la app */}
          {stats.adViews > 0 ? (
            <Card style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.kpiIcon, { backgroundColor: Brand.jacarandaSoft, marginBottom: 0 }]}>
                  <Ionicons name="megaphone-outline" size={20} color={Brand.jacaranda} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Tu anuncio al abrir la app</Text>
                  <Text style={styles.muted}>Se cuenta aparte de las visitas a tu página</Text>
                </View>
              </View>
              <BarRow label="Lo vieron" value={stats.adViews} max={stats.adViews} right={plural(stats.adViews, 'persona', 'personas')} color={Brand.jacaranda} />
              <BarRow
                label="Lo tocaron y entraron"
                value={stats.adTaps}
                max={stats.adViews}
                right={n(stats.adTaps)}
                color={Brand.jacaranda}
                sub={`${pct(stats.adTaps, stats.adViews)}% de quienes lo vieron`}
              />
            </Card>
          ) : null}

          {/* Embudo */}
          <Card style={{ gap: 14 }}>
            <View>
              <Text style={styles.cardTitle}>De ver a comprar</Text>
              <Text style={styles.muted}>Cuántas personas avanzan en cada paso</Text>
            </View>
            <BarRow label="Vieron tu negocio" value={stats.funnel.visitors} max={stats.funnel.visitors} right={n(stats.funnel.visitors)} />
            <BarRow
              label={business.modules.includes('ordenar') ? 'Vieron tus servicios' : 'Vieron tus servicios'}
              value={stats.funnel.catalog}
              max={stats.funnel.visitors}
              right={n(stats.funnel.catalog)}
              sub={`${pct(stats.funnel.catalog, stats.funnel.visitors)}% de quienes entraron`}
            />
            <BarRow
              label={business.modules.includes('ordenar') ? 'Eligieron un producto' : 'Eligieron un servicio'}
              value={stats.funnel.selected}
              max={stats.funnel.visitors}
              right={n(stats.funnel.selected)}
              sub={`${pct(stats.funnel.selected, stats.funnel.catalog)}% de quienes lo abrieron`}
            />
            <BarRow
              label={conv.verb}
              value={stats.funnel.converted}
              max={stats.funnel.visitors}
              right={n(stats.funnel.converted)}
              color={Brand.nopal}
              sub={`${pct(stats.funnel.converted, stats.funnel.visitors)}% de quienes entraron`}
            />
          </Card>

          {/* Tiempo */}
          <Card style={{ gap: 14 }}>
            <View>
              <Text style={styles.cardTitle}>¿Cuánto tiempo se quedan?</Text>
              <Text style={styles.muted}>Tiempo total en tu página, servicios y reseñas por visita</Text>
            </View>
            {[
              { label: 'Menos de 10 segundos', v: stats.dwell.lt10 },
              { label: '10 a 30 segundos', v: stats.dwell.s10to30 },
              { label: '30 segundos a 1 minuto', v: stats.dwell.s30to60 },
              { label: 'Más de 1 minuto', v: stats.dwell.gt60 },
            ].map((r) => (
              <BarRow
                key={r.label}
                label={r.label}
                value={r.v}
                max={visits}
                right={`${pct(r.v, visits)}%`}
                color={Brand.alberca}
                sub={plural(r.v, 'visita', 'visitas')}
              />
            ))}
          </Card>

          {/* Productos */}
          <Card style={{ gap: 14 }}>
            <View>
              <Text style={styles.cardTitle}>Lo que más eligen</Text>
              <Text style={styles.muted}>Veces que agregaron al pedido, reservaron o cotizaron</Text>
            </View>
            {stats.topItems.length === 0 ? <Text style={styles.muted}>Todavía nadie elige un producto en este periodo.</Text> : null}
            {stats.topItems.map((it, i) => (
              <BarRow key={it.itemId} label={`${i + 1}. ${itemName(it.itemId)}`} value={it.selections} max={maxItem} right={n(it.selections)} />
            ))}
          </Card>

          {/* Origen */}
          <Card style={{ gap: 14 }}>
            <View>
              <Text style={styles.cardTitle}>Cómo te encuentran</Text>
              <Text style={styles.muted}>Desde dónde llegaron a tu página</Text>
            </View>
            {stats.sources.map((s) => (
              <BarRow
                key={s.source}
                label={SOURCE_LABEL[s.source] ?? s.source}
                value={s.visitors}
                max={maxSource}
                right={n(s.visitors)}
                color={Brand.jacaranda}
              />
            ))}
          </Card>

          {/* Horas */}
          {period !== '1' ? (
            <Card>
              <Text style={styles.cardTitle}>Tus horas fuertes</Text>
              {Math.max(...stats.hours) > 0 ? (
                <Text style={styles.muted}>
                  Más visitas de {peak} a {peak + 1} h
                </Text>
              ) : null}
              <ColumnChart
                data={hoursSlice}
                selected={picked?.startsWith('h') ? picked.slice(1) : undefined}
                onSelect={(k) => setPicked(`h${k}`)}
                height={90}
                labelEvery={3}
                color={Brand.mango}
                activeColor="#C98A0B"
                describe={(c) => `${c.key}:00 a ${Number(c.key) + 1}:00 h · ${plural(c.value, 'visita', 'visitas')}`}
              />
            </Card>
          ) : null}

          {/* Sugerencias */}
          {advice.length ? (
            <View style={styles.tips}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="bulb-outline" size={20} color="#5A3E00" />
                <Text style={[styles.cardTitle, { color: '#5A3E00' }]}>Sugerencias para ti</Text>
              </View>
              {advice.map((a) => (
                <Text key={a} style={styles.tipText}>
                  • {a}
                </Text>
              ))}
            </View>
          ) : null}

          <Text style={styles.foot}>
            {source === 'en_vivo'
              ? 'Datos reales de Expertalia 360. Tus propias visitas no cuentan. '
              : 'Cifras de ejemplo más las visitas hechas desde este teléfono. Cuando el dueño inicie sesión verá las de todos los clientes. '}
            Son anónimas: contamos cuántas personas entran y cuánto se quedan, no quiénes son.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: -34, borderRadius: Radius.lg, gap: 6, ...ShadowStrong },
  heroLabel: { fontSize: 14, color: Brand.inkSoft, fontWeight: '600' },
  heroValue: {
    fontSize: 46,
    fontWeight: '800',
    color: Brand.ink,
    letterSpacing: -1,
    lineHeight: 50,
  },
  delta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 8,
  },
  deltaText: { fontSize: 13, fontWeight: '800' },
  engagedRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginTop: 8,
  },
  engagedText: { flex: 1, fontSize: 14, color: Brand.ink, lineHeight: 20 },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: Brand.line,
    overflow: 'hidden',
    marginTop: 4,
  },
  fill: { height: '100%', borderRadius: 5, backgroundColor: Brand.chile },
  muted: { fontSize: 12, color: Brand.inkSoft, marginTop: 2 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: Brand.ink },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  kpi: {
    width: '48.5%',
    backgroundColor: Brand.white,
    borderRadius: Radius.lg,
    padding: 14,
    gap: 2,
  },
  kpiIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiValue: { fontSize: 24, fontWeight: '800', color: Brand.ink },
  kpiLabel: { fontSize: 13, fontWeight: '700', color: Brand.ink },
  kpiSub: { fontSize: 11, color: Brand.inkSoft },
  tips: {
    backgroundColor: Brand.mangoSoft,
    borderRadius: Radius.lg,
    padding: 16,
    gap: 8,
  },
  tipText: { fontSize: 14, color: '#5A3E00', lineHeight: 20 },
  foot: {
    fontSize: 12,
    color: Brand.inkSoft,
    lineHeight: 17,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});
