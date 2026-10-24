import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { QrCode } from '@/components/qr-code';
import { Button, Card, Header } from '@/components/ui';
import { Brand, TabBarSpace } from '@/constants/theme';
import { PROMOTIONS } from '@/data';
import { useApp } from '@/store/app';

export default function MiQR() {
  const router = useRouter();
  const { state } = useApp();
  const phone = state.userPhone.replace(/\s/g, '');
  const masked = `${state.userPhone.slice(0, 3)} *** ${state.userPhone.slice(-4)}`;
  const stamps = state.stamps['despacho-contable-reyes'] ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <ScrollView contentContainerStyle={{ paddingBottom: TabBarSpace + 20 }}>
        <Header title="Mi QR" extraBottom={170}>
          <Text style={styles.hint}>Muéstralo en el mostrador para sumar puntos o pagar</Text>
        </Header>
        <Card strong style={styles.qrCard}>
          <View style={styles.qrFrame}>
            <QrCode value={`expertalia360:cliente:${phone}`} size={210} />
          </View>
          <Text style={styles.name}>{state.userName} G.</Text>
          <Text style={styles.sub}>o dicta tu celular: {masked}</Text>
        </Card>

        <View style={styles.stats}>
          <Card style={styles.stat}>
            <Text style={styles.statValue}>{state.points.toLocaleString('es-MX')}</Text>
            <Text style={styles.statLabel}>puntos</Text>
          </Card>
          <Card style={styles.stat}>
            <Text style={styles.statValue}>{PROMOTIONS.length}</Text>
            <Text style={styles.statLabel}>cupones</Text>
          </Card>
          <Card style={styles.stat}>
            <Text style={styles.statValue}>{stamps}/12</Text>
            <Text style={styles.statLabel}>sellos</Text>
          </Card>
        </View>

        <View style={{ paddingHorizontal: 20, gap: 10, marginTop: 20 }}>
          <Button label="Ver mis tarjetas y cupones" onPress={() => router.push('/lealtad')} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { color: '#D6E0F0', textAlign: 'center', fontSize: 14, marginTop: 14 },
  qrCard: { marginHorizontal: 28, marginTop: -160, alignItems: 'center', borderRadius: 28, padding: 24 },
  qrFrame: { padding: 10, borderRadius: 16, borderWidth: 2, borderColor: Brand.line, backgroundColor: Brand.white },
  name: { fontSize: 20, fontWeight: '800', color: Brand.ink, marginTop: 16 },
  sub: { fontSize: 13, color: Brand.inkSoft, marginTop: 2 },
  stats: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 20 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statValue: { fontSize: 20, fontWeight: '800', color: Brand.ink },
  statLabel: { fontSize: 11, color: Brand.inkSoft },
});
