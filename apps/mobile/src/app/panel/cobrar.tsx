import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Emoji } from '@/components/emoji';
import { SpeakButton } from '@/components/speak-button';
import { Button, Card, Segmented } from '@/components/ui';
import type { EmojiName } from '@/constants/emoji';
import { Brand, Radius, Shadow, TabBarSpace } from '@/constants/theme';
import type { PaymentMethod } from '@/data/types';
import { money } from '@/lib/format';
import { copyText, openWhatsApp, reviewLink } from '@/lib/links';
import { myBusiness, useApp } from '@/store/app';

type Mode = 'pagado' | 'pedir';
const METHODS: { value: PaymentMethod; label: string; emoji: EmojiName }[] = [
  { value: 'efectivo', label: 'Efectivo', emoji: 'billete' },
  { value: 'transferencia', label: 'Transferencia', emoji: 'banco' },
  { value: 'tarjeta', label: 'Tarjeta', emoji: 'tarjeta' },
];
const OTHER = '__otra__';

/**
 * Cobrar, pensado para quien no lleva contabilidad:
 * - "Ya me pagó": anota el pago (quién, por qué, cuánto y cómo) y manda el recibo por WhatsApp.
 * - "Pedir un pago": arma el mensaje con el monto y tus datos de transferencia y lo manda por WhatsApp.
 * La app no cobra con tarjeta todavía: solo lleva la cuenta.
 */
export default function Cobrar() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, actions } = useApp();
  const [mode, setMode] = useState<Mode>('pagado');
  const [who, setWho] = useState<string | null>(null);
  const [otherName, setOtherName] = useState('');
  const [phone, setPhone] = useState('');
  const [concept, setConcept] = useState<string | null>(null);
  const [otherConcept, setOtherConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [saved, setSaved] = useState<{ name: string; phone: string; concept: string; amount: number; method: PaymentMethod } | null>(null);
  const [copied, setCopied] = useState(false);

  // Clientes que ya te buscaron por la app (citas, cotizaciones y contrataciones)
  const clients = useMemo(() => {
    const seen = new Map<string, string | undefined>();
    for (const r of state.requests) if (r.status !== 'rechazada' && !seen.has(r.customer)) seen.set(r.customer, r.customerPhone);
    return [...seen.entries()].slice(0, 8).map(([name, tel]) => ({ name, phone: tel }));
  }, [state.requests]);
  const services = state.myItems.filter((i) => i.available).slice(0, 8);

  const name = who === OTHER ? otherName.trim() : who ?? '';
  const tel = who === OTHER ? phone : clients.find((c) => c.name === who)?.phone ?? phone;
  const what = concept === OTHER ? otherConcept.trim() : concept ?? '';
  const n = Number(amount.replace(/[^\d.]/g, '')) || 0;
  const readyPaid = name && what && n > 0 && method;
  const readyAsk = name && what && n > 0;
  const info = myBusiness.paymentInfo;

  const reset = () => {
    setWho(null);
    setOtherName('');
    setPhone('');
    setConcept(null);
    setOtherConcept('');
    setAmount('');
    setMethod(null);
    setSaved(null);
    setCopied(false);
  };

  const askText = `Hola ${name.split(' ')[0]}, te comparto el pago de ${what}: ${money(n)}.\n${info ? `Puedes transferir a: ${info}.` : 'Dime cómo prefieres pagar.'}\nGracias. ${myBusiness.name}`;

  if (saved) {
    const receipt = `Recibo de ${myBusiness.name}\n${saved.concept}\nTotal pagado: ${money(saved.amount)} en ${METHODS.find((m) => m.value === saved.method)?.label.toLowerCase()}\nFecha: ${new Date().toLocaleDateString('es-MX')}\nGracias por tu confianza.`;
    return (
      <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
        <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
          <Text style={styles.headerTitle}>Pago guardado</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: TabBarSpace + 20 }}>
          <Card style={{ alignItems: 'center', gap: 6 }}>
            <Emoji name="palomita" size={64} />
            <Text style={styles.big}>{money(saved.amount)}</Text>
            <Text style={styles.sub}>
              {saved.name} · {saved.concept} · {METHODS.find((m) => m.value === saved.method)?.label}
            </Text>
            <Text style={styles.small}>Ya aparece en tu Resumen de cobros.</Text>
          </Card>
          <Text style={styles.step}>¿Qué sigue?</Text>
          <Button label="Mandarle su recibo por WhatsApp" icon="logo-whatsapp" onPress={() => openWhatsApp(receipt, saved.phone)} />
          <Button
            label="Pedirle que te califique"
            icon="star-outline"
            variant="ghost"
            onPress={() => openWhatsApp(`Hola ${saved.name.split(' ')[0]}, gracias por tu confianza. ¿Me ayudas con una reseña? Toma 1 minuto: ${reviewLink(myBusiness.slug)}`, saved.phone)}
          />
          <Button label="Anotar otro pago" variant="ghost" icon="add" onPress={reset} />
          <Button label="Ver resumen de cobros" variant="dark" onPress={() => router.push('/mi-negocio/corte')} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Text style={styles.headerTitle}>Cobrar</Text>
        <View style={{ alignSelf: 'stretch', paddingHorizontal: 16, marginTop: 10 }}>
          <Segmented
            dark
            value={mode}
            onChange={setMode}
            options={[
              { value: 'pagado', label: 'Ya me pagó' },
              { value: 'pedir', label: 'Pedir un pago' },
            ]}
          />
        </View>
        <Text style={styles.headerSub}>
          {mode === 'pagado' ? 'Anota el pago para llevar tus cuentas y mándale su recibo.' : 'Le mandas por WhatsApp cuánto es y tus datos para transferir.'}
        </Text>
        <SpeakButton
          dark
          compact
          center
          text={
            mode === 'pagado'
              ? 'Ya me pagó. Elige quién te pagó, por qué servicio, cuánto y cómo. Luego toca guardar y le mandas su recibo por WhatsApp.'
              : 'Pedir un pago. Elige a quién, por qué servicio y cuánto. La app arma el mensaje con tus datos de transferencia y lo manda por WhatsApp.'
          }
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: TabBarSpace + 30 }} keyboardShouldPersistTaps="handled">
        {/* 1. Quién */}
        <Text style={styles.step}>
          <Text style={styles.num}>1 </Text>¿{mode === 'pagado' ? 'Quién te pagó' : 'A quién le cobras'}?
        </Text>
        <View style={styles.wrap}>
          {clients.map((c) => (
            <Choice key={c.name} label={c.name} emoji="saludo" on={who === c.name} onPress={() => setWho(c.name)} />
          ))}
          <Choice label="Otra persona" emoji="personas" on={who === OTHER} onPress={() => setWho(OTHER)} />
        </View>
        {who === OTHER ? (
          <Card style={{ gap: 10 }}>
            <Input value={otherName} onChangeText={setOtherName} placeholder="Nombre del cliente" />
            <Input value={phone} onChangeText={setPhone} placeholder="WhatsApp (10 dígitos, opcional)" keyboardType="phone-pad" />
          </Card>
        ) : null}

        {/* 2. Por qué */}
        <Text style={styles.step}>
          <Text style={styles.num}>2 </Text>¿Por qué servicio?
        </Text>
        <View style={styles.wrap}>
          {services.map((s) => (
            <Choice
              key={s.id}
              label={s.price ? `${s.name} · ${money(s.price)}` : s.name}
              emoji="portapapeles"
              on={concept === s.name}
              onPress={() => {
                setConcept(s.name);
                if (s.price) setAmount(String(s.price));
              }}
            />
          ))}
          <Choice label="Otro" emoji="nota" on={concept === OTHER} onPress={() => setConcept(OTHER)} />
        </View>
        {concept === OTHER ? <Input value={otherConcept} onChangeText={setOtherConcept} placeholder="Ej. Anticipo del juicio, cambio de tubería…" /> : null}

        {/* 3. Cuánto */}
        <Text style={styles.step}>
          <Text style={styles.num}>3 </Text>¿Cuánto?
        </Text>
        <View style={[styles.amountBox, Shadow]}>
          <Emoji name="dinero" size={34} />
          <Text style={styles.peso}>$</Text>
          <TextInput
            value={amount}
            onChangeText={(t) => setAmount(t.replace(/[^\d]/g, '').slice(0, 7))}
            placeholder="0"
            placeholderTextColor={Brand.inkMuted}
            keyboardType="number-pad"
            style={styles.amountInput}
            accessibilityLabel="Monto en pesos"
          />
        </View>

        {mode === 'pagado' ? (
          <>
            {/* 4. Cómo */}
            <Text style={styles.step}>
              <Text style={styles.num}>4 </Text>¿Cómo te pagó?
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {METHODS.map((m) => (
                <Pressable
                  key={m.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: method === m.value }}
                  onPress={() => setMethod(m.value)}
                  style={[styles.method, Shadow, method === m.value && styles.methodOn]}>
                  <Emoji name={m.emoji} size={34} />
                  <Text style={[styles.methodText, method === m.value && { color: Brand.white }]}>{m.label}</Text>
                </Pressable>
              ))}
            </View>
            {method === 'tarjeta' ? <Text style={styles.small}>Con tu propia terminal. La app todavía no cobra con tarjeta; aquí solo lo anotas.</Text> : null}
            <Button
              label={readyPaid ? `Guardar pago de ${money(n)}` : 'Completa los 4 pasos'}
              icon={readyPaid ? 'checkmark' : undefined}
              disabled={!readyPaid}
              style={{ marginTop: 8 }}
              onPress={() => {
                const known = clients.some((c) => c.name === who);
                actions.registerSale({ amount: n, method: method!, customerName: name, customerPhone: tel.replace(/\D/g, '') || undefined, concept: what, fromApp: known });
                setSaved({ name, phone: tel, concept: what, amount: n, method: method! });
              }}
            />
          </>
        ) : (
          <>
            <Text style={styles.step}>
              <Text style={styles.num}>4 </Text>Tus datos para que te paguen
            </Text>
            {info ? (
              <Card style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <Emoji name="banco" size={32} />
                <Text style={[styles.sub, { flex: 1 }]}>{info}</Text>
              </Card>
            ) : (
              <Card style={{ gap: 8, backgroundColor: Brand.mangoSoft }}>
                <Text style={styles.sub}>Aún no tienes datos de transferencia. Agrégalos una vez en tu perfil (paso 5) y se pondrán solos en el mensaje.</Text>
                <Button label="Agregar mis datos" small variant="dark" onPress={() => router.push('/mi-negocio/perfil')} />
              </Card>
            )}
            {readyAsk ? (
              <Card style={{ backgroundColor: '#E7F8EE' }}>
                <Text style={styles.small}>Así le llega:</Text>
                <Text style={[styles.sub, { marginTop: 4 }]}>{askText}</Text>
              </Card>
            ) : null}
            <Button label={readyAsk ? 'Mandar por WhatsApp' : 'Completa los pasos 1 a 3'} icon={readyAsk ? 'logo-whatsapp' : undefined} disabled={!readyAsk} onPress={() => openWhatsApp(askText, tel)} />
            {readyAsk ? (
              <Button
                label={copied ? 'Mensaje copiado' : 'Copiar mensaje'}
                variant="ghost"
                icon={copied ? 'checkmark' : 'copy-outline'}
                onPress={async () => setCopied(await copyText(askText))}
              />
            ) : null}
            <Text style={styles.small}>Cuando te pague, regresa a “Ya me pagó” para anotarlo.</Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Choice({ label, emoji, on, onPress }: { label: string; emoji: EmojiName; on: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={onPress} style={[styles.choice, Shadow, on && styles.choiceOn]}>
      <Emoji name={emoji} size={22} />
      <Text style={[styles.choiceText, on && { color: Brand.white }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput placeholderTextColor={Brand.inkMuted} {...props} style={styles.input} />;
}

const styles = StyleSheet.create({
  header: { backgroundColor: Brand.ink, alignItems: 'center', paddingBottom: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, gap: 8 },
  headerTitle: { color: Brand.white, fontSize: 19, fontWeight: '800' },
  headerSub: { color: '#C9D2E3', fontSize: 13, textAlign: 'center', paddingHorizontal: 24 },
  step: { fontSize: 17, fontWeight: '800', color: Brand.ink, marginTop: 8 },
  num: { color: Brand.chile },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: Radius.pill, backgroundColor: Brand.white, maxWidth: '100%' },
  choiceOn: { backgroundColor: Brand.chile },
  choiceText: { fontSize: 15, fontWeight: '700', color: Brand.ink, flexShrink: 1 },
  input: { height: 52, borderRadius: Radius.md, borderWidth: 1, borderColor: Brand.line, backgroundColor: Brand.white, paddingHorizontal: 14, fontSize: 16, color: Brand.ink },
  amountBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Brand.white, borderRadius: Radius.lg, paddingHorizontal: 16, height: 76 },
  peso: { fontSize: 34, fontWeight: '800', color: Brand.ink },
  amountInput: { flex: 1, fontSize: 38, fontWeight: '800', color: Brand.ink, minWidth: 0 },
  method: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: Radius.lg, backgroundColor: Brand.white },
  methodOn: { backgroundColor: Brand.chile },
  methodText: { fontSize: 14, fontWeight: '800', color: Brand.ink },
  big: { fontSize: 34, fontWeight: '800', color: Brand.ink },
  sub: { fontSize: 15, color: Brand.ink, lineHeight: 21 },
  small: { fontSize: 13, color: Brand.inkSoft, lineHeight: 18 },
});
