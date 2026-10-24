import { StyleSheet, Text, View } from 'react-native';

import { AdminCard, AdminShell } from '@/components/admin-shell';
import { Chip } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { money } from '@/lib/format';

const PLANS = [
  { name: 'Básico', price: 0, includes: 'Perfil, pin en el mapa, hasta 10 productos, reseñas', count: 78 },
  { name: 'Plata', price: 399, includes: 'Catálogo ilimitado, pedidos o agenda, cobro en la app, recordatorios, 3 promociones', count: 36 },
  { name: 'Oro', price: 799, includes: 'Todo Plata + varios empleados, campañas a clientes, 10% en espacios', count: 12 },
];

const PAYOUTS = [
  { biz: 'Ortiz Salinas Abogados', amount: 18420, status: 'Programado viernes' },
  { biz: 'Despacho Contable Reyes', amount: 9310, status: 'Programado viernes' },
  { biz: 'Notaría Pública 14', amount: 22780, status: 'Pagado' },
];

export default function AdminCobros() {
  const mrr = PLANS.reduce((a, p) => a + p.price * p.count, 0);
  return (
    <AdminShell title="Planes y cobros" subtitle={`Suscripciones: ${money(mrr)} al mes · comisión por pedido 5%`}>
      <View style={styles.row}>
        {PLANS.map((p) => (
          <AdminCard key={p.name} style={{ flexGrow: 1, flexBasis: 240, gap: 6 }}>
            <Text style={styles.name}>{p.name}</Text>
            <Text style={styles.price}>{p.price ? `${money(p.price)}/mes` : 'Gratis'}</Text>
            <Text style={styles.sub}>{p.includes}</Text>
            <Chip label={`${p.count} negocios`} />
          </AdminCard>
        ))}
      </View>
      <AdminCard style={{ gap: 4 }}>
        <Text style={styles.name}>Depósitos a negocios</Text>
        {PAYOUTS.map((p) => (
          <View key={p.biz} style={styles.payout}>
            <Text style={[styles.text, { flex: 1 }]}>{p.biz}</Text>
            <Text style={styles.name}>{money(p.amount)}</Text>
            <Chip label={p.status} color={p.status === 'Pagado' ? Brand.nopalSoft : Brand.mangoSoft} ink={p.status === 'Pagado' ? Brand.nopalDark : '#5A3E00'} />
          </View>
        ))}
        <Text style={styles.sub}>Pagos en línea vía Stripe Connect o Mercado Pago Marketplace; la comisión se descuenta antes del depósito.</Text>
      </AdminCard>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  name: { fontSize: 15, fontWeight: '800', color: Brand.ink },
  price: { fontSize: 24, fontWeight: '800', color: Brand.chile },
  sub: { fontSize: 12, color: Brand.inkSoft, lineHeight: 17 },
  text: { fontSize: 14, color: Brand.ink },
  payout: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Brand.line, flexWrap: 'wrap' },
});
