import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AdminCard, AdminShell } from '@/components/admin-shell';
import { Button } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { money } from '@/lib/format';
import { useApp } from '@/store/app';

export default function AdminResumen() {
  const router = useRouter();
  const { state } = useApp();
  const adIncome = state.campaigns.filter((c) => c.status === 'activa' || c.status === 'terminada').reduce((a, c) => a + c.total, 0) + 24000;
  const sources = [
    { label: 'Publicidad y espacios preferenciales', value: adIncome },
    { label: 'Suscripciones de negocios', value: 24350 },
    { label: 'Comisión por pedidos', value: 15800 },
    { label: 'Comisión por red de expertos', value: 4100 },
  ];
  const max = Math.max(...sources.map((s) => s.value));
  const total = sources.reduce((a, s) => a + s.value, 0);

  const pending = [
    { text: `${state.pendingBusinesses.length} negocios por aprobar`, href: '/admin/negocios', cta: 'Revisar' },
    { text: `${state.campaigns.filter((c) => c.status === 'en_revision').length} campañas en revisión`, href: '/admin/publicidad', cta: 'Aprobar' },
    { text: `${state.reportedReviews.length} reseñas reportadas`, href: '/admin/moderacion', cta: 'Moderar' },
  ] as const;

  return (
    <AdminShell
      title="Resumen de la plataforma"
      subtitle="Este mes · Querétaro · datos de ejemplo"
      action={<Button label="Nueva campaña de publicidad" small onPress={() => router.push('/admin/campana-nueva')} />}>
      <View style={styles.kpis}>
        {[
          ['Clientes activos', '4,820', '+18% vs mes anterior'],
          ['Negocios activos', '126', '48 en plan de pago'],
          ['Pedidos y citas', '3,912', '$612,400 vendidos en la app'],
        ].map(([a, b, c]) => (
          <AdminCard key={a} style={styles.kpi}>
            <Text style={styles.muted}>{a}</Text>
            <Text style={styles.kpiValue}>{b}</Text>
            <Text style={[styles.muted, { color: Brand.nopalDark, fontWeight: '700' }]}>{c}</Text>
          </AdminCard>
        ))}
        <AdminCard style={[styles.kpi, { backgroundColor: Brand.ink }]}>
          <Text style={[styles.muted, { color: '#B7C1D3' }]}>Ingresos del mes</Text>
          <Text style={[styles.kpiValue, { color: Brand.white }]}>{money(total)}</Text>
          <Text style={{ color: Brand.mango, fontWeight: '700', fontSize: 12 }}>Publicidad: {Math.round((adIncome / total) * 100)}%</Text>
        </AdminCard>
      </View>

      <View style={styles.row}>
        <AdminCard style={{ flexGrow: 1, flexBasis: 360, gap: 12 }}>
          <Text style={styles.h}>Ingresos por fuente</Text>
          {sources.map((s) => (
            <View key={s.label} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.text}>{s.label}</Text>
                <Text style={styles.strong}>{money(s.value)}</Text>
              </View>
              <View style={styles.barBg}>
                <View style={[styles.bar, { width: `${(s.value / max) * 100}%` }]} />
              </View>
            </View>
          ))}
        </AdminCard>
        <AdminCard style={{ flexGrow: 1, flexBasis: 300 }}>
          <Text style={styles.h}>Por atender</Text>
          {pending.map((p) => (
            <View key={p.text} style={styles.pending}>
              <Text style={styles.text}>{p.text}</Text>
              <Pressable onPress={() => router.push(p.href)} accessibilityRole="link">
                <Text style={styles.link}>{p.cta}</Text>
              </Pressable>
            </View>
          ))}
        </AdminCard>
      </View>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpi: { flexGrow: 1, flexBasis: 200, gap: 4 },
  kpiValue: { fontSize: 28, fontWeight: '800', color: Brand.ink },
  muted: { fontSize: 13, color: Brand.inkSoft },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  h: { fontSize: 16, fontWeight: '800', color: Brand.ink, marginBottom: 4 },
  text: { fontSize: 14, color: Brand.ink, flexShrink: 1 },
  strong: { fontSize: 14, fontWeight: '800', color: Brand.ink },
  barBg: { height: 10, borderRadius: 5, backgroundColor: '#EEF1F6' },
  bar: { height: 10, borderRadius: 5, backgroundColor: Brand.chile },
  pending: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Brand.line, gap: 10 },
  link: { fontSize: 13, fontWeight: '800', color: Brand.chileDark },
});
