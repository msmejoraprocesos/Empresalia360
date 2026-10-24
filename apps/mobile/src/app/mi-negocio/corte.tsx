import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, EmptyState, Header, IconCircle } from '@/components/ui';
import { Brand } from '@/constants/theme';
import type { IconName, PaymentMethod } from '@/data/types';
import { money } from '@/lib/format';
import { useApp } from '@/store/app';

const M: Record<PaymentMethod, { label: string; icon: IconName; color: string }> = {
  efectivo: { label: 'Efectivo', icon: 'cash-outline', color: Brand.nopal },
  tarjeta: { label: 'Tarjeta', icon: 'card-outline', color: Brand.alberca },
  transferencia: { label: 'Transferencia', icon: 'swap-horizontal', color: Brand.jacaranda },
  liga: { label: 'Liga de pago', icon: 'link-outline', color: '#C98A0B' },
};

function time(t: number) {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function Corte() {
  const router = useRouter();
  const { state } = useApp();
  const total = state.sales.reduce((a, s) => a + s.amount, 0);
  // Solo se muestran las formas de pago que sí se usaron
  const methods = (Object.keys(M) as PaymentMethod[])
    .map((m) => ({ m, sum: state.sales.filter((s) => s.method === m).reduce((a, s) => a + s.amount, 0) }))
    .filter((x) => x.sum > 0);

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title="Resumen de cobros" subtitle="Lo que has anotado en Cobrar" color={Brand.ink} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        <Card style={{ alignItems: 'center' }}>
          <Text style={styles.sub}>Total cobrado</Text>
          <Text style={styles.big}>{money(total)}</Text>
          <Text style={styles.sub}>{state.sales.length === 1 ? '1 pago' : `${state.sales.length} pagos`}</Text>
        </Card>
        <Button label="Anotar un pago" icon="add" onPress={() => router.push('/panel/cobrar')} />
        {state.sales.length === 0 ? <EmptyState icon="wallet-outline" title="Aún no anotas pagos" text="Cuando un cliente te pague, anótalo en Cobrar y aquí verás cuánto llevas." /> : null}
        {methods.length ? <Card style={{ gap: 12 }}>
          {methods.map(({ m, sum }) => (
            <View key={m} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.name}>{M[m].label}</Text>
                <Text style={styles.name}>{money(sum)}</Text>
              </View>
              <View style={styles.barBg}>
                <View style={[styles.bar, { width: `${total ? (sum / total) * 100 : 0}%`, backgroundColor: M[m].color }]} />
              </View>
            </View>
          ))}
        </Card> : null}
        {state.sales.length ? <Text style={styles.label}>Pagos</Text> : null}
        {state.sales.map((s) => (
          <Card key={s.id} style={styles.row}>
            <IconCircle icon={M[s.method].icon} color={M[s.method].color} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{s.customerName ?? 'Cliente'}</Text>
              <Text style={styles.sub}>
                {[s.concept, M[s.method].label, `${new Date(s.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} ${time(s.createdAt)}`].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Text style={styles.name}>{money(s.amount)}</Text>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  big: { fontSize: 38, fontWeight: '800', color: Brand.ink },
  sub: { fontSize: 12, color: Brand.inkSoft, marginTop: 2 },
  name: { fontSize: 14, fontWeight: '800', color: Brand.ink },
  label: { fontSize: 14, fontWeight: '800', color: Brand.ink, marginTop: 4 },
  barBg: { height: 10, borderRadius: 5, backgroundColor: Brand.line, overflow: 'hidden' },
  bar: { height: 10, borderRadius: 5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
