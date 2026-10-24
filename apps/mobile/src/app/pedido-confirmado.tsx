import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, IconCircle } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { money } from '@/lib/format';
import { useApp } from '@/store/app';

export default function PedidoConfirmado() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useApp();
  const last = state.orders[0];

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 28 }]}>
      <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
        <IconCircle icon="checkmark" color={Brand.nopal} size={110} />
        <Text style={styles.title}>¡Listo! Servicio contratado</Text>
        {last ? (
          <Text style={styles.text}>
            {last.businessName} ya recibió tu solicitud. Total {money(last.total)}. Te escribirá para coordinar los detalles.
          </Text>
        ) : null}
        <View style={styles.points}>
          <Text style={styles.pointsText}>+20 puntos Expertalia 360</Text>
        </View>
      </View>
      <View style={{ gap: 12, alignSelf: 'stretch' }}>
        <Button label="Ver mis citas y servicios" onPress={() => router.replace('/cliente/pedidos')} />
        <Button label="Volver al inicio" variant="ghost" onPress={() => router.replace('/cliente')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.tortilla, paddingHorizontal: 24, alignItems: 'center' },
  title: { marginTop: 28, fontSize: 26, fontWeight: '800', color: Brand.ink, textAlign: 'center' },
  text: { marginTop: 10, fontSize: 15, color: Brand.inkSoft, textAlign: 'center', lineHeight: 22 },
  points: { marginTop: 20, backgroundColor: Brand.mango, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  pointsText: { fontWeight: '800', color: Brand.ink },
});
