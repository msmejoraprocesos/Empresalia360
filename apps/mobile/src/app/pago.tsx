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
import { useApp } from '@/store/app';

const METHODS: { value: PaymentMethod; label: string; sub: string }[] = [
  { value: 'tarjeta', label: 'Tarjeta', sub: 'en la app' },
  { value: 'efectivo', label: 'Efectivo', sub: 'al recibir' },
  { value: 'transferencia', label: 'Transferencia', sub: 'CLABE o DiMo' },
];
const TIPS = [0, 10, 15, 20];

export default function Pago() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { state, actions } = useApp();
  const b = getBusiness(slug ?? state.cart.businessSlug ?? undefined);
  const [method, setMethod] = useState<PaymentMethod>('tarjeta');
  const [tip, setTip] = useState(10);
  const [note, setNote] = useState('');
  const [address, setAddress] = useState('Calle Zen 214, Zen House');
  const [locating, setLocating] = useState(false);
  const [located, setLocated] = useState<string | null>(null);

  if (!b || state.cart.businessSlug !== b.slug) {
    return (
      <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
        <Header title="Confirmar pedido" />
        <EmptyState icon="bag-handle-outline" title="Tu carrito está vacío" text="Agrega servicios desde el perfil de un profesional." />
      </View>
    );
  }

  const lines = Object.entries(state.cart.lines).map(([id, qty]) => ({ item: b.items.find((i) => i.id === id)!, qty })).filter((l) => l.item);
  const subtotal = lines.reduce((a, l) => a + (l.item.price ?? 0) * l.qty, 0);
  const delivery = state.cart.mode === 'domicilio';
  const shipping = delivery ? 35 : 0;
  const tipAmount = delivery ? Math.round((subtotal * tip) / 100) : 0;
  const total = subtotal + shipping + tipAmount;

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
      <Header title="Confirmar pedido" subtitle={b.name} />
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
            <Text style={styles.label}>¿Dónde te lo llevamos?</Text>
            <Card style={{ gap: 12 }}>
              <View style={styles.mapMini}>
                <View style={styles.pinTag}>
                  <Text style={styles.pinTagText}>Estoy aquí</Text>
                </View>
                <Ionicons name="location" size={40} color={Brand.chile} />
              </View>
              <Button label={locating ? 'Buscando…' : 'Usar mi ubicación actual'} variant="ghost" icon="navigate" small onPress={locate} disabled={locating} />
              {located ? <Text style={styles.hint}>{located}</Text> : null}
              <Field label="Dirección" value={address} onChangeText={setAddress} />
              <Field label="Referencias para el repartidor" value={note} onChangeText={setNote} placeholder="Casa blanca, portón negro" />
            </Card>
          </>
        ) : null}

        <Text style={styles.label}>Pago</Text>
        <View style={styles.row3}>
          {METHODS.map((m) => (
            <View key={m.value} style={{ flex: 1 }}>
              <OptionPill label={m.label} sub={m.sub} selected={method === m.value} onPress={() => setMethod(m.value)} />
            </View>
          ))}
        </View>

        {delivery ? (
          <>
            <Text style={styles.label}>Propina para el repartidor</Text>
            <View style={styles.row3}>
              {TIPS.map((t) => (
                <View key={t} style={{ flex: 1 }}>
                  <OptionPill label={t === 0 ? 'Sin' : `${t}%`} selected={tip === t} onPress={() => setTip(t)} />
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      <BottomBar>
        <View style={styles.line}>
          <Text style={styles.muted}>Subtotal</Text>
          <Text style={styles.muted}>{money(subtotal)}</Text>
        </View>
        {delivery ? (
          <View style={styles.line}>
            <Text style={styles.muted}>Envío y propina</Text>
            <Text style={styles.muted}>{money(shipping + tipAmount)}</Text>
          </View>
        ) : null}
        <View style={styles.line}>
          <Text style={styles.total}>Total</Text>
          <Text style={styles.total}>{money(total)}</Text>
        </View>
        <Button
          label={method === 'efectivo' ? `Pedir y pagar al recibir · ${money(total)}` : `Pagar ${money(total)}`}
          onPress={() => {
            actions.placeOrder({ business: b, mode: state.cart.mode, method, total, note: delivery ? `${address}. ${note}` : undefined });
            router.replace('/pedido-confirmado');
          }}
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
