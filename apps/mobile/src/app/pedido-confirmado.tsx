import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Emoji } from '@/components/emoji';
import { Button, Card, IconCircle } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { getBusiness } from '@/data';
import { money } from '@/lib/format';
import { openWhatsApp } from '@/lib/links';
import { useApp } from '@/store/app';

export default function PedidoConfirmado() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useApp();
  const last = state.orders[0];
  const b = getBusiness(last?.businessSlug);
  const transfer = last?.paymentMethod === 'transferencia';

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 28 }]}>
      <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
        <IconCircle icon="checkmark" color={Brand.nopal} size={110} />
        <Text style={styles.title}>¡Listo! Servicio contratado</Text>
        {last ? (
          <Text style={styles.text}>
            {last.businessName} ya recibió tu solicitud. Total {money(last.total)}.{' '}
            {transfer ? 'Transfiérele con estos datos y avísale por WhatsApp.' : 'Le pagas en efectivo al atenderte. Te escribirá para coordinar.'}
          </Text>
        ) : null}
        {transfer && b ? (
          <Card style={{ marginTop: 16, alignSelf: 'stretch', gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Emoji name="banco" size={32} />
              <Text style={{ flex: 1, fontSize: 15, color: Brand.ink, lineHeight: 21 }} selectable>
                {b.paymentInfo ?? 'El experto te mandará sus datos por WhatsApp.'}
              </Text>
            </View>
            <Button
              label="Ya transferí · avisar por WhatsApp"
              icon="logo-whatsapp"
              small
              onPress={() => openWhatsApp(`Hola, ya te transferí ${money(last.total)} por: ${last.detail}. Te mando el comprobante.`, b.phone)}
            />
          </Card>
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
