import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, IconCircle } from '@/components/ui';
import { Brand, Radius, Shadow, TabBarSpace } from '@/constants/theme';
import type { IconName, PaymentMethod } from '@/data/types';
import { money } from '@/lib/format';
import { MY_BUSINESS_SLUG } from '@/data';
import { useApp } from '@/store/app';

const METHODS: { value: PaymentMethod; label: string; icon: IconName; color: string; ink: string }[] = [
  { value: 'efectivo', label: 'Efectivo', icon: 'cash-outline', color: Brand.nopal, ink: Brand.white },
  { value: 'tarjeta', label: 'Tarjeta', icon: 'card-outline', color: Brand.alberca, ink: Brand.white },
  { value: 'transferencia', label: 'Transfer.', icon: 'swap-horizontal', color: Brand.jacaranda, ink: Brand.white },
  { value: 'liga', label: 'Liga', icon: 'link-outline', color: Brand.mango, ink: Brand.ink },
];
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del'];
const KNOWN: Record<string, string> = { '4423180094': 'Ana G.', '4421112233': 'Rodrigo M.' };

export default function Cobrar() {
  const insets = useSafeAreaInsets();
  const { state, actions } = useApp();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('efectivo');
  const [phone, setPhone] = useState('');
  const [done, setDone] = useState<string | null>(null);

  const n = Number(amount || '0');
  const digits = phone.replace(/\D/g, '');
  const customer = digits.length === 10 ? KNOWN[digits] ?? 'Cliente nuevo' : null;
  const stamps = state.stamps[MY_BUSINESS_SLUG] ?? 0;

  const press = (k: string) => {
    setDone(null);
    if (k === 'del') return setAmount((a) => a.slice(0, -1));
    setAmount((a) => (a === '' && (k === '0' || k === '00') ? a : (a + k).slice(0, 6)));
  };

  const charge = () => {
    actions.registerSale({ amount: n, method, customerPhone: digits.length === 10 ? digits : undefined, customerName: customer ?? undefined });
    setDone(
      `${money(n)} en ${METHODS.find((m) => m.value === method)?.label.toLowerCase()}` +
        (customer ? ` · ${customer} sumó 1 sello y recibió su liga para calificarte` : ''),
    );
    setAmount('');
    setPhone('');
  };

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Text style={styles.headerTitle}>Cobrar</Text>
        <Text style={styles.darkMuted}>Monto a cobrar</Text>
        <Text style={styles.amount} accessibilityLabel={`Monto ${money(n)}`}>
          {money(n)}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: TabBarSpace + 10 }} keyboardShouldPersistTaps="handled">
        {done ? (
          <View style={styles.done}>
            <Ionicons name="checkmark-circle" size={22} color={Brand.nopalDark} />
            <Text style={{ flex: 1, color: '#234A38', fontSize: 13 }}>Cobro registrado: {done}</Text>
          </View>
        ) : null}

        <View style={styles.methods}>
          {METHODS.map((m) => {
            const on = m.value === method;
            return (
              <Pressable key={m.value} onPress={() => setMethod(m.value)} accessibilityRole="button" accessibilityState={{ selected: on }} style={styles.method}>
                <View style={on ? { borderRadius: 30, borderWidth: 3, borderColor: m.color, padding: 2 } : { padding: 5 }}>
                  <IconCircle icon={m.icon} color={on ? m.color : Brand.white} ink={on ? m.ink : Brand.inkSoft} size={50} outline={!on} />
                </View>
                <Text style={[styles.methodLabel, on && { color: Brand.ink, fontWeight: '800' }]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.keys}>
          {KEYS.map((k) => (
            <Pressable key={k} onPress={() => press(k)} accessibilityRole="button" accessibilityLabel={k === 'del' ? 'Borrar' : k} style={({ pressed }) => [styles.key, Shadow, pressed && { backgroundColor: Brand.line }]}>
              {k === 'del' ? <Ionicons name="backspace-outline" size={26} color={Brand.ink} /> : <Text style={styles.keyText}>{k}</Text>}
            </Pressable>
          ))}
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 14, gap: 10 }}>
          <Text style={styles.label}>Celular del cliente para sus puntos (opcional)</Text>
          <View style={styles.phoneRow}>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="10 dígitos"
              placeholderTextColor={Brand.inkMuted}
              style={styles.phone}
              accessibilityLabel="Celular del cliente"
              maxLength={12}
            />
            <IconCircle icon="qr-code-outline" color={Brand.white} ink={Brand.ink} size={52} square outline />
          </View>
          {customer ? (
            <Text style={styles.hint}>
              {customer} · con este cobro lleva {Math.min(10, stamps + 1)} de 10 sellos
            </Text>
          ) : null}
          <Button label={n > 0 ? `Cobrar ${money(n)} · ${METHODS.find((m) => m.value === method)?.label}` : 'Teclea el monto'} disabled={n <= 0} onPress={charge} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: Brand.ink, alignItems: 'center', paddingBottom: 22, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerTitle: { color: Brand.white, fontSize: 17, fontWeight: '800', marginBottom: 10 },
  darkMuted: { color: '#B7C1D3', fontSize: 12 },
  amount: { color: Brand.white, fontSize: 52, fontWeight: '800', letterSpacing: -1 },
  done: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 16, marginBottom: 0, padding: 12, borderRadius: Radius.md, backgroundColor: Brand.nopalSoft },
  methods: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 14 },
  method: { flex: 1, alignItems: 'center', gap: 4 },
  methodLabel: { fontSize: 11, color: Brand.inkSoft },
  keys: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 10, rowGap: 10 },
  key: { width: '31.5%', height: 58, borderRadius: 18, backgroundColor: Brand.white, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 24, fontWeight: '700', color: Brand.ink },
  label: { fontSize: 13, fontWeight: '700', color: Brand.inkSoft },
  phoneRow: { flexDirection: 'row', gap: 8 },
  phone: { flex: 1, height: 52, borderRadius: Radius.md, borderWidth: 1, borderColor: Brand.line, backgroundColor: Brand.white, paddingHorizontal: 14, fontSize: 17, fontWeight: '600', color: Brand.ink },
  hint: { fontSize: 13, color: Brand.nopalDark, fontWeight: '700' },
});
