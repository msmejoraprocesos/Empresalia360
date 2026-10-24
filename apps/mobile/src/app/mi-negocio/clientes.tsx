import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Header, IconCircle } from '@/components/ui';
import { Brand, Radius } from '@/constants/theme';
import { MY_BUSINESS_SLUG } from '@/data';
import { money } from '@/lib/format';
import { myBusiness, useApp } from '@/store/app';

const CUSTOMERS = [
  { name: 'Ana G.', visits: 18, spent: 2480, last: 'hoy', stamps: 8 },
  { name: 'Rodrigo M.', visits: 11, spent: 1310, last: 'hace 2 días', stamps: 6 },
  { name: 'Lucía P.', visits: 7, spent: 860, last: 'hace 5 días', stamps: 3 },
  { name: 'Javier R.', visits: 4, spent: 420, last: 'hace 34 días', stamps: 4 },
];

export default function Clientes() {
  const { state } = useApp();
  const goal = myBusiness.loyalty?.goal ?? 10;
  const inactive = CUSTOMERS.filter((c) => c.last.includes('34'));

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title="Clientes y lealtad" color={Brand.ink} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        <Card style={{ backgroundColor: Brand.chile }}>
          <Text style={{ color: Brand.white, fontWeight: '800', fontSize: 16 }}>Tu tarjeta de sellos</Text>
          <Text style={{ color: '#D6E0F0', marginTop: 4 }}>
            {goal} sellos = {myBusiness.loyalty?.reward}. Se suma al cobrar con el celular o QR del cliente.
          </Text>
        </Card>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Card style={{ flex: 1 }}>
            <Text style={styles.big}>412</Text>
            <Text style={styles.sub}>clientes con tarjeta</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={styles.big}>64%</Text>
            <Text style={styles.sub}>vuelven en 30 días</Text>
          </Card>
        </View>
        {inactive.length ? (
          <Card style={{ gap: 10, backgroundColor: Brand.mangoSoft }}>
            <Text style={{ fontWeight: '800', color: '#5A3E00' }}>{inactive.length} cliente no ha vuelto en 30 días</Text>
            <Button label="Mandarle una promoción" variant="dark" small />
          </Card>
        ) : null}
        <Text style={styles.label}>Clientes frecuentes</Text>
        {CUSTOMERS.map((c) => {
          const stamps = c.name === 'Ana G.' ? state.stamps[MY_BUSINESS_SLUG] ?? c.stamps : c.stamps;
          return (
            <Card key={c.name} style={styles.row}>
              <IconCircle icon="person" color={Brand.chileSoft} ink={Brand.chileDark} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{c.name}</Text>
                <Text style={styles.sub}>
                  {c.visits} visitas · {money(c.spent)} · última {c.last}
                </Text>
                <View style={styles.dots}>
                  {Array.from({ length: goal }, (_, i) => (
                    <View key={i} style={[styles.dot, i < stamps && { backgroundColor: Brand.chile, borderColor: Brand.chile }]} />
                  ))}
                </View>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  big: { fontSize: 24, fontWeight: '800', color: Brand.ink },
  sub: { fontSize: 12, color: Brand.inkSoft, marginTop: 2 },
  label: { fontSize: 14, fontWeight: '800', color: Brand.ink, marginTop: 4 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '800', color: Brand.ink },
  dots: { flexDirection: 'row', gap: 4, marginTop: 8 },
  dot: { width: 14, height: 14, borderRadius: Radius.pill, borderWidth: 2, borderColor: '#CBD3DF' },
});
