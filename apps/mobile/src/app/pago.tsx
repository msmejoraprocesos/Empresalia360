import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomBar, Button, Card, EmptyState, Field, Header, OptionPill } from '@/components/ui';
import { Brand, Radius } from '@/constants/theme';
import { getBusiness } from '@/data';
import type { PaymentMethod } from '@/data/types';
import { money } from '@/lib/format';
import { useLoginGate } from '@/lib/auth';
import { useApp } from '@/store/app';

// La app todavía no cobra: el cliente le paga directo al experto.
const METHODS: { value: PaymentMethod; label: string; sub: string }[] = [
  { value: 'efectivo', label: 'Efectivo', sub: 'al atenderte' },
  { value: 'transferencia', label: 'Transferencia', sub: 'te damos sus datos' },
];

export default function Pago() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { state, actions } = useApp();
  const gate = useLoginGate();
  const b = getBusiness(slug ?? state.cart.businessSlug ?? undefined);
  const [method, setMethod] = useState<PaymentMethod>('efectivo');
  const [note, setNote] = useState('');
  const [address, setAddress] = useState('');
  const [locating, setLocating] = useState(false);
  const [located, setLocated] = useState<string | null>(null);

  if (!b || state.cart.businessSlug !== b.slug) {
    return (
      <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
        <Header title="Contratar servicio" />
        <EmptyState icon="bag-handle-outline" title="No has elegido servicios" text="Agrega un paquete desde el perfil de un profesional." />
      </View>
    );
  }

  const lines = Object.entries(state.cart.lines).map(([id, qty]) => ({ item: b.items.find((i) => i.id === id)!, qty })).filter((l) => l.item);
  const subtotal = lines.reduce((a, l) => a + (l.item.price ?? 0) * l.qty, 0);
  const delivery = state.cart.mode === 'domicilio';
  const total = subtotal;

  const locate = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({});
        setLocated(`Ubicación del teléfono · precisión ${Math.round(pos.coords.accuracy ?? 10)} m`);
      } else {
        setLocated('Sin permiso de ubicación: escribe tu dirección');
      }
    } catch {
      setLocated('No pudimos obtener tu ubicación: escribe tu dirección');
    }
    setLocating(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title="Contratar servicio" subtitle={b.name} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 220 }} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: 8 }}>
          {lines.map((l) => (
            <View key={l.item.id} style={styles.line}>
              <Text style={styles.lineText}>
                {l.qty} × {l.item.name}
              </Text>
              <Text style={styles.lineText}>{money((l.item.price ?? 0) * l.qty)}</Text>
            </View>
          ))}
        </Card>

        {delivery ? (
          <>
            <Text style={styles.label}>¿Dónde será el servicio?</Text>
            <Card style={{ gap: 12 }}>
              <View style={styles.mapMini}>
                <View style={styles.pinTag}>
                  <Text style={styles.pinTagText}>Estoy aquí</Text>
                </View>
                <Ionicons name="location" size={40} color={Brand.chile} />
              </View>
              <Button label={locating ? 'Buscando…' : 'Usar mi ubicación actual'} variant="ghost" icon="navigate" small onPress={locate} disabled={locating} />
              {located ? <Text style={styles.hint}>{located}</Text> : null}
              <Field label="Dirección" value={address} onChangeText={setAddress} placeholder="Calle, número y colonia" />
              <Field label="Referencias para llegar" value={note} onChangeText={setNote} placeholder="Casa blanca, portón negro, frente al parque" />
            </Card>
          </>
        ) : null}

        <Text style={styles.label}>¿Cómo le vas a pagar?</Text>
        <Text style={styles.hint}>Le pagas directo a {b.name}. Expertalia 360 no cobra comisión al cliente. Pago con tarjeta en la app: próximamente.</Text>
        <View style={styles.row3}>
          {METHODS.map((m) => (
            <View key={m.value} style={{ flex: 1 }}>
              <OptionPill label={m.label} sub={m.sub} selected={method === m.value} onPress={() => setMethod(m.value)} />
            </View>
          ))}
        </View>

      </ScrollView>

      <BottomBar>
        <View style={styles.line}>
          <Text style={styles.muted}>Subtotal</Text>
          <Text style={styles.muted}>{money(subtotal)}</Text>
        </View>
        <View style={styles.line}>
          <Text style={styles.total}>Total</Text>
          <Text style={styles.total}>{money(total)}</Text>
        </View>
        <Button
          label={method === 'efectivo' ? `Contratar · pagas al atenderte` : `Contratar · ver datos para transferir`}
          disabled={delivery && !address.trim()}
          onPress={() => gate(() => {
            actions.placeOrder({ business: b, mode: state.cart.mode, method, total, note: delivery ? `${address}. ${note}` : undefined });
            router.replace('/pedido-confirmado');
          })}
        />
      </BottomBar>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', justifyContent: 'space-between' },
  lineText: { fontSize: 14, color: Brand.ink },
  label: { fontSize: 14, fontWeight: '800', color: Brand.ink, marginTop: 4 },
  mapMini: { height: 120, borderRadius: Radius.md, backgroundColor: '#E6EAF1', alignItems: 'center', justifyContent: 'center' },
  pinTag: { backgroundColor: Brand.ink, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill, marginBottom: 2 },
  pinTagText: { color: Brand.white, fontSize: 11, fontWeight: '800' },
  hint: { fontSize: 12, color: Brand.inkSoft },
  row3: { flexDirection: 'row', gap: 8 },
  muted: { fontSize: 13, color: Brand.inkSoft },
  total: { fontSize: 17, fontWeight: '800', color: Brand.ink },
});
