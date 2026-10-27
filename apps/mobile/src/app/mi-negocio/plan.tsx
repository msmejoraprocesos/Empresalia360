import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Emoji } from '@/components/emoji';
import { PhotoPicker } from '@/components/photo-picker';
import { SpeakButton } from '@/components/speak-button';
import { Button, Card, Chip, Header } from '@/components/ui';
import { COBRO_EXPERTALIA, MERCADO_PAGO_ACTIVO, SOPORTE_CORREO } from '@/constants/contacto';
import { Brand, Radius, Shadow } from '@/constants/theme';
import { newBilling, planPrice, worldOf, billingStatus, daysLeft, DIAS_GRACIA, MESES, niceDate, planById, PLANS, STATUS_UI, type PlanId, type SubPayment } from '@/data/billing';
import { money } from '@/lib/format';
import { startCardSubscription } from '@/data/remote';
import { copyText } from '@/lib/links';
import { isSupabaseConfigured } from '@/lib/supabase';
import { myBusiness, useApp } from '@/store/app';

const METHODS: { id: SubPayment['method']; label: string }[] = [
  { id: 'transferencia', label: 'Transferencia' },
  { id: 'deposito', label: 'Depósito (OXXO o banco)' },
  { id: 'efectivo', label: 'Efectivo' },
];

/** Mi plan: en qué plan estoy, hasta cuándo está pagado, cómo pagar y avisar que ya pagué. */
export default function MiPlan() {
  const { state, actions } = useApp();
  const bill = state.billing[myBusiness.slug] ?? newBilling();
  const st = billingStatus(bill);
  const left = daysLeft(bill.paidUntil);
  const [plan, setPlan] = useState<PlanId>(bill.plan);
  const [months, setMonths] = useState(1);
  const [method, setMethod] = useState<SubPayment['method']>('transferencia');
  const [reference, setReference] = useState('');
  const [receipt, setReceipt] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [paying, setPaying] = useState(false);
  const [how, setHow] = useState<'tarjeta' | 'transferencia' | null>(null);
  const [mpEmail, setMpEmail] = useState(state.account?.email ?? '');
  const [cardBusy, setCardBusy] = useState(false);
  const [cardError, setCardError] = useState('');
  const [cancelAsk, setCancelAsk] = useState(false);
  const { mp: fromMp } = useLocalSearchParams<{ mp?: string }>();
  // Regreso de Mercado Pago: se vuelve a leer el estado (el aviso de Mercado Pago llega en segundos)
  useEffect(() => {
    if (!fromMp) return;
    void actions.refreshBilling();
    const t = setTimeout(() => void actions.refreshBilling(), 8000);
    return () => clearTimeout(t);
  }, [fromMp, actions]);
  const cardOn = !isSupabaseConfigured || MERCADO_PAGO_ACTIVO;
  const auto = bill.auto === 'activo' || bill.auto === 'pendiente' ? bill.auto : null;
  const pending = bill.payments.find((p) => p.status === 'pendiente');
  const m = MESES.find((x) => x.months === months)!;
  const world = worldOf(myBusiness.categorySlug);
  const amount = planPrice(plan, world) * m.pay;
  const ui = STATUS_UI[st];

  const statusText =
    st === 'prueba'
      ? `Estás en tu prueba gratis hasta el ${niceDate(bill.paidUntil)} (quedan ${left} días). Elige tu plan y paga antes para no dejar de aparecer.`
      : st === 'al_corriente'
        ? `Pagado hasta el ${niceDate(bill.paidUntil)}. Te quedan ${left} días.`
        : st === 'por_vencer'
          ? left === 0
            ? 'Tu plan vence hoy. Paga para no perder tus beneficios.'
            : `Tu plan vence en ${left} días (${niceDate(bill.paidUntil)}). Paga para no perder tus beneficios.`
          : st === 'vencido'
            ? `Tu plan venció hace ${-left} días. Tienes ${DIAS_GRACIA + left} días de gracia antes de que tu perfil se oculte.`
            : 'Tu perfil está oculto: los clientes ya no te encuentran. En cuanto confirmemos tu pago vuelves a aparecer, con tus reseñas y todo.';

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title="Mi plan" subtitle={myBusiness.name} color={Brand.ink} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Card style={[{ gap: 8 }, (st === 'vencido' || st === 'suspendido') && { borderWidth: 2, borderColor: '#A32020' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Emoji name={st === 'al_corriente' ? 'palomita' : st === 'prueba' ? 'regalo' : st === 'por_vencer' ? 'reloj' : 'sirena'} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={styles.big}>Plan {planById(bill.plan).name}</Text>
              <Chip label={ui.label} color={ui.bg} ink={ui.fg} />
            </View>
          </View>
          <Text style={styles.text}>{statusText}</Text>
          <SpeakButton compact text={`Plan ${planById(bill.plan).name}. ${statusText}`} />
        </Card>

        {fromMp && !auto ? (
          <Card style={{ backgroundColor: '#E3ECFB', gap: 6 }}>
            <Text style={styles.h}>Regresaste de Mercado Pago</Text>
            <Text style={styles.text}>Si ya pusiste tu tarjeta, en unos minutos aparece aquí “Cobro automático activo” y tu fecha se recorre sola.</Text>
          </Card>
        ) : null}

        {auto ? (
          <Card style={{ backgroundColor: '#E3ECFB', gap: 8, borderWidth: 2, borderColor: '#1F3A68' }}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Emoji name="tarjeta" size={36} />
              <View style={{ flex: 1 }}>
                <Text style={styles.h}>{auto === 'activo' ? 'Cobro automático activo' : 'Falta terminar en Mercado Pago'}</Text>
                <Text style={styles.text}>
                  {auto === 'activo'
                    ? `Cada mes se cobran ${money(planPrice(bill.plan, world))} a tu tarjeta y tu fecha se recorre sola. No tienes que hacer nada.`
                    : 'Empezaste a pagar con tarjeta pero no terminaste. Vuelve a tocar “Pagar con tarjeta”.'}
                </Text>
              </View>
            </View>
            {auto === 'activo' ? (
              cancelAsk ? (
                <View style={{ gap: 8 }}>
                  <Text style={styles.text}>¿Seguro? Ya no se cobrará solo. Al vencer tendrás que pagar por transferencia para seguir apareciendo.</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button label="No, dejarlo" small variant="ghost" style={{ flex: 1 }} onPress={() => setCancelAsk(false)} />
                    <Button label="Sí, cancelar" small variant="dark" style={{ flex: 1 }} onPress={() => { actions.cancelCard(myBusiness.slug); setCancelAsk(false); }} />
                  </View>
                </View>
              ) : (
                <Button label="Cancelar cobro automático" small variant="ghost" onPress={() => setCancelAsk(true)} />
              )
            ) : null}
          </Card>
        ) : null}

        {pending ? (
          <Card style={{ backgroundColor: '#FFF7E0', gap: 6 }}>
            <Text style={styles.h}>Pago en revisión</Text>
            <Text style={styles.text}>
              Avisaste que pagaste {money(pending.amount)} ({pending.months === 1 ? '1 mes' : `${pending.months} meses`} de {planById(pending.plan).name}). Lo confirmamos en menos de 24 h hábiles y tu fecha se recorre sola.
            </Text>
          </Card>
        ) : !paying ? (
          <Button
            label={st === 'prueba' ? 'Elegir mi plan y pagar' : st === 'al_corriente' ? 'Adelantar mi pago o cambiar de plan' : 'Pagar mi mensualidad'}
            icon="card-outline"
            onPress={() => setPaying(true)}
          />
        ) : (
          <>
            <Text style={styles.step}>
              <Text style={styles.num}>1 </Text>Elige tu plan
            </Text>
            {PLANS.map((p) => (
              <Pressable key={p.id} accessibilityRole="radio" accessibilityState={{ checked: plan === p.id }} onPress={() => setPlan(p.id)} style={[styles.plan, Shadow, plan === p.id && styles.planOn]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.h, plan === p.id && { color: Brand.white }]}>{p.name}</Text>
                  <Text style={[styles.price, plan === p.id && { color: '#E3B04B' }]}>{money(p.prices[world])}/mes</Text>
                </View>
                {p.features.map((f) => (
                  <Text key={f} style={[styles.feat, plan === p.id && { color: '#DCE3F0' }]}>
                    ✓ {f}
                  </Text>
                ))}
              </Pressable>
            ))}

            <Text style={styles.step}>
              <Text style={styles.num}>2 </Text>¿Cómo quieres pagar?
            </Text>
            {cardOn ? (
              <Pressable accessibilityRole="radio" accessibilityState={{ checked: how === 'tarjeta' }} onPress={() => setHow('tarjeta')} style={[styles.plan, Shadow, how === 'tarjeta' && styles.howOn]}>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <Emoji name="tarjeta" size={34} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.h}>Con tarjeta, cada mes automático</Text>
                    <Text style={styles.feat}>Recomendado: se cobra solo y nunca se te pasa la fecha. Con Mercado Pago.</Text>
                  </View>
                </View>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="radio" accessibilityState={{ checked: how === 'transferencia' }} onPress={() => setHow('transferencia')} style={[styles.plan, Shadow, how === 'transferencia' && styles.howOn]}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <Emoji name="banco" size={34} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.h}>Transferencia, depósito o efectivo</Text>
                  <Text style={styles.feat}>Pagas 1, 3 o 12 meses (12 meses: 2 gratis) y nos avisas con tu comprobante.</Text>
                </View>
              </View>
            </Pressable>

            {how === 'tarjeta' ? (
              <>
                <Card style={{ alignItems: 'center' }}>
                  <Text style={styles.small}>Se cobra cada mes</Text>
                  <Text style={styles.total}>{money(planPrice(plan, world))}</Text>
                  <Text style={styles.small}>Plan {planById(plan).name} · puedes cancelar cuando quieras</Text>
                </Card>
                {isSupabaseConfigured ? (
                  <TextInput
                    value={mpEmail}
                    onChangeText={setMpEmail}
                    placeholder="Correo de tu cuenta de Mercado Pago"
                    placeholderTextColor={Brand.inkMuted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={styles.input}
                  />
                ) : null}
                {cardError ? <Text style={{ color: '#A32020', fontWeight: '700' }}>{cardError}</Text> : null}
                <Button
                  label={cardBusy ? 'Abriendo Mercado Pago…' : `Pagar con tarjeta ${money(planPrice(plan, world))}/mes`}
                  icon="card-outline"
                  disabled={cardBusy}
                  onPress={async () => {
                    setCardError('');
                    if (!isSupabaseConfigured) {
                      // Demostración: se simula que ya autorizó su tarjeta
                      actions.activateCardDemo(myBusiness.slug, plan, planPrice(plan, world));
                      setPaying(false);
                      setHow(null);
                      return;
                    }
                    setCardBusy(true);
                    const r = await startCardSubscription(plan, mpEmail.trim() || undefined);
                    setCardBusy(false);
                    if (!r.url) return setCardError(r.error ?? 'No se pudo abrir Mercado Pago');
                    if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.href = r.url;
                    else void Linking.openURL(r.url);
                  }}
                />
                <Text style={styles.small}>Te llevamos a Mercado Pago para poner tu tarjeta de forma segura. Expertalia 360 nunca ve los datos de tu tarjeta.</Text>
              </>
            ) : null}

            {how === 'transferencia' ? (
              <>
              <Text style={styles.step}>
                <Text style={styles.num}>3 </Text>¿Cuántos meses?
              </Text>
              <View style={styles.wrap}>
                {MESES.map((x) => (
                  <Pressable key={x.months} onPress={() => setMonths(x.months)} style={[styles.pill, months === x.months && styles.pillOn]} accessibilityRole="radio" accessibilityState={{ checked: months === x.months }}>
                    <Text style={[styles.pillText, months === x.months && { color: Brand.white }]}>{x.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Card style={{ alignItems: 'center' }}>
                <Text style={styles.small}>Total a pagar</Text>
                <Text style={styles.total}>{money(amount)}</Text>
              </Card>

              <Text style={styles.step}>
                <Text style={styles.num}>4 </Text>Paga a Expertalia 360
              </Text>
              <Card style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <Emoji name="banco" size={32} />
                  <Text style={[styles.text, { flex: 1 }]} selectable>
                    {COBRO_EXPERTALIA || `Pide los datos de pago a ${SOPORTE_CORREO}`}
                  </Text>
                </View>
                {COBRO_EXPERTALIA ? (
                  <Button label={copied ? 'Datos copiados' : 'Copiar datos'} small variant="ghost" icon={copied ? 'checkmark' : 'copy-outline'} onPress={async () => setCopied(await copyText(COBRO_EXPERTALIA))} />
                ) : null}
                <Text style={styles.small}>En el concepto escribe: {myBusiness.slug}</Text>
              </Card>

              <Text style={styles.step}>
                <Text style={styles.num}>5 </Text>Avísanos que ya pagaste
              </Text>
              <View style={styles.wrap}>
                {METHODS.map((x) => (
                  <Pressable key={x.id} onPress={() => setMethod(x.id)} style={[styles.pill, method === x.id && styles.pillOn]} accessibilityRole="radio" accessibilityState={{ checked: method === x.id }}>
                    <Text style={[styles.pillText, method === x.id && { color: Brand.white }]}>{x.label}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput value={reference} onChangeText={setReference} placeholder="Referencia o folio (opcional)" placeholderTextColor={Brand.inkMuted} style={styles.input} />
              <PhotoPicker label="Foto del comprobante" value={receipt} onChange={setReceipt} hint="Una captura de la transferencia o foto del ticket" />
              <Button
                label={`Ya pagué ${money(amount)}`}
                icon="checkmark"
                onPress={() => {
                  actions.reportSubPayment(myBusiness.slug, { plan, months, amount, method, reference: reference.trim() || undefined, receipt });
                  setPaying(false);
                }}
              />
              </>
            ) : null}
            <Button label="Cancelar" variant="ghost" onPress={() => setPaying(false)} />
          </>
        )}

        {bill.payments.length ? <Text style={styles.step}>Mis pagos</Text> : null}
        {bill.payments.map((p) => (
          <Card key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.h}>
                {money(p.amount)} · {planById(p.plan).name} · {p.months === 1 ? '1 mes' : `${p.months} meses`}
              </Text>
              <Text style={styles.small}>
                {new Date(p.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                {p.periodEnd ? ` · cubre hasta ${niceDate(p.periodEnd)}` : ''}
              </Text>
            </View>
            <Chip
              label={p.status === 'pagado' ? 'Confirmado' : p.status === 'pendiente' ? 'En revisión' : 'No se encontró'}
              color={p.status === 'pagado' ? '#DDF3E8' : p.status === 'pendiente' ? '#FFF1CC' : '#FDE2E2'}
              ink={p.status === 'pagado' ? '#0C6B47' : p.status === 'pendiente' ? '#7A5600' : '#A32020'}
            />
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  big: { fontSize: 20, fontWeight: '800', color: Brand.ink, marginBottom: 4 },
  h: { fontSize: 16, fontWeight: '800', color: Brand.ink },
  text: { fontSize: 15, color: Brand.ink, lineHeight: 21 },
  small: { fontSize: 12, color: Brand.inkSoft },
  step: { fontSize: 17, fontWeight: '800', color: Brand.ink, marginTop: 6 },
  num: { color: Brand.chile },
  plan: { backgroundColor: Brand.white, borderRadius: Radius.lg, padding: 16, gap: 4 },
  planOn: { backgroundColor: '#13203F' },
  howOn: { borderWidth: 3, borderColor: Brand.chile },
  price: { fontSize: 18, fontWeight: '800', color: Brand.chile },
  feat: { fontSize: 14, color: Brand.inkSoft },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.pill, backgroundColor: Brand.white, borderWidth: 1, borderColor: Brand.line },
  pillOn: { backgroundColor: Brand.chile, borderColor: Brand.chile },
  pillText: { fontSize: 14, fontWeight: '700', color: Brand.ink },
  total: { fontSize: 32, fontWeight: '800', color: Brand.ink },
  input: { height: 50, borderRadius: Radius.md, borderWidth: 1, borderColor: Brand.line, backgroundColor: Brand.white, paddingHorizontal: 14, fontSize: 16, color: Brand.ink },
});
