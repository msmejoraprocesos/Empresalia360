import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Emoji } from '@/components/emoji';
import { PhotoPicker } from '@/components/photo-picker';
import { SpeakButton } from '@/components/speak-button';
import { Button, Card, Chip, Header } from '@/components/ui';
import { COBRO_EXPERTALIA, SOPORTE_CORREO } from '@/constants/contacto';
import { Brand, Radius, Shadow } from '@/constants/theme';
import { billingStatus, daysLeft, DIAS_GRACIA, MESES, niceDate, planById, PLANS, STATUS_UI, type PlanId, type SubPayment } from '@/data/billing';
import { money } from '@/lib/format';
import { copyText } from '@/lib/links';
import { myBusiness, useApp } from '@/store/app';

const METHODS: { id: SubPayment['method']; label: string }[] = [
  { id: 'transferencia', label: 'Transferencia' },
  { id: 'deposito', label: 'Depósito (OXXO o banco)' },
  { id: 'efectivo', label: 'Efectivo' },
];

/** Mi plan: en qué plan estoy, hasta cuándo está pagado, cómo pagar y avisar que ya pagué. */
export default function MiPlan() {
  const { state, actions } = useApp();
  const bill = state.billing[myBusiness.slug] ?? { plan: 'basico' as PlanId, payments: [] };
  const st = billingStatus(bill);
  const left = daysLeft(bill.paidUntil);
  const [plan, setPlan] = useState<PlanId>(bill.plan === 'basico' ? 'plata' : bill.plan);
  const [months, setMonths] = useState(1);
  const [method, setMethod] = useState<SubPayment['method']>('transferencia');
  const [reference, setReference] = useState('');
  const [receipt, setReceipt] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [paying, setPaying] = useState(false);
  const pending = bill.payments.find((p) => p.status === 'pendiente');
  const m = MESES.find((x) => x.months === months)!;
  const amount = planById(plan).price * m.pay;
  const ui = STATUS_UI[st];

  const statusText =
    st === 'gratis'
      ? 'Estás en el plan gratis. Sube de plan para salir antes en las búsquedas.'
      : st === 'al_corriente'
        ? `Pagado hasta el ${niceDate(bill.paidUntil)}. Te quedan ${left} días.`
        : st === 'por_vencer'
          ? left === 0
            ? 'Tu plan vence hoy. Paga para no perder tus beneficios.'
            : `Tu plan vence en ${left} días (${niceDate(bill.paidUntil)}). Paga para no perder tus beneficios.`
          : st === 'vencido'
            ? `Tu plan venció hace ${-left} días. Tienes ${DIAS_GRACIA + left} días de gracia antes de bajar a Básico.`
            : 'Tu plan se venció y bajaste a Básico. Sigues visible, pero sin los beneficios. Paga para regresar.';

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title="Mi plan" subtitle={myBusiness.name} color={Brand.ink} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Card style={[{ gap: 8 }, (st === 'vencido' || st === 'suspendido') && { borderWidth: 2, borderColor: '#A32020' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Emoji name={st === 'al_corriente' ? 'palomita' : st === 'gratis' ? 'regalo' : st === 'por_vencer' ? 'reloj' : 'sirena'} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={styles.big}>Plan {planById(bill.plan).name}</Text>
              <Chip label={ui.label} color={ui.bg} ink={ui.fg} />
            </View>
          </View>
          <Text style={styles.text}>{statusText}</Text>
          <SpeakButton compact text={`Plan ${planById(bill.plan).name}. ${statusText}`} />
        </Card>

        {pending ? (
          <Card style={{ backgroundColor: '#FFF7E0', gap: 6 }}>
            <Text style={styles.h}>Pago en revisión</Text>
            <Text style={styles.text}>
              Avisaste que pagaste {money(pending.amount)} ({pending.months === 1 ? '1 mes' : `${pending.months} meses`} de {planById(pending.plan).name}). Lo confirmamos en menos de 24 h hábiles y tu fecha se recorre sola.
            </Text>
          </Card>
        ) : !paying ? (
          <Button
            label={st === 'gratis' ? 'Subir de plan' : st === 'al_corriente' ? 'Adelantar mi pago' : 'Pagar mi mensualidad'}
            icon="card-outline"
            onPress={() => setPaying(true)}
          />
        ) : (
          <>
            <Text style={styles.step}>
              <Text style={styles.num}>1 </Text>Elige tu plan
            </Text>
            {PLANS.filter((p) => p.price > 0).map((p) => (
              <Pressable key={p.id} accessibilityRole="radio" accessibilityState={{ checked: plan === p.id }} onPress={() => setPlan(p.id)} style={[styles.plan, Shadow, plan === p.id && styles.planOn]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.h, plan === p.id && { color: Brand.white }]}>{p.name}</Text>
                  <Text style={[styles.price, plan === p.id && { color: '#E3B04B' }]}>{money(p.price)}/mes</Text>
                </View>
                {p.features.map((f) => (
                  <Text key={f} style={[styles.feat, plan === p.id && { color: '#DCE3F0' }]}>
                    ✓ {f}
                  </Text>
                ))}
              </Pressable>
            ))}

            <Text style={styles.step}>
              <Text style={styles.num}>2 </Text>¿Cuántos meses?
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
              <Text style={styles.num}>3 </Text>Paga a Expertalia 360
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
              <Text style={styles.num}>4 </Text>Avísanos que ya pagaste
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
  price: { fontSize: 18, fontWeight: '800', color: Brand.chile },
  feat: { fontSize: 14, color: Brand.inkSoft },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.pill, backgroundColor: Brand.white, borderWidth: 1, borderColor: Brand.line },
  pillOn: { backgroundColor: Brand.chile, borderColor: Brand.chile },
  pillText: { fontSize: 14, fontWeight: '700', color: Brand.ink },
  total: { fontSize: 32, fontWeight: '800', color: Brand.ink },
  input: { height: 50, borderRadius: Radius.md, borderWidth: 1, borderColor: Brand.line, backgroundColor: Brand.white, paddingHorizontal: 14, fontSize: 16, color: Brand.ink },
});
