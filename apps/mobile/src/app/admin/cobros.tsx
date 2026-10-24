import { Image } from 'expo-image';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { AdminCard, AdminShell } from '@/components/admin-shell';
import { Button, Chip } from '@/components/ui';
import { Brand, Radius } from '@/constants/theme';
import { BUSINESSES } from '@/data';
import {
  activePlan,
  billingStatus,
  daysLeft,
  DIAS_AVISO,
  DIAS_GRACIA,
  MESES,
  niceDate,
  planById,
  PLANS,
  STATUS_UI,
  type Billing,
  type BillingStatus,
  type PlanId,
  type SubPayment,
} from '@/data/billing';
import { money } from '@/lib/format';
import { openWhatsApp } from '@/lib/links';
import { useApp } from '@/store/app';

type Tab = 'confirmar' | 'vencidos' | 'por_vencer' | 'al_corriente' | 'gratis';
const TABS: { id: Tab; label: string }[] = [
  { id: 'confirmar', label: 'Por confirmar' },
  { id: 'vencidos', label: 'Vencidos' },
  { id: 'por_vencer', label: 'Por vencer' },
  { id: 'al_corriente', label: 'Al corriente' },
  { id: 'gratis', label: 'Plan gratis' },
];
const METHOD: Record<string, string> = { transferencia: 'Transferencia', deposito: 'Depósito', efectivo: 'Efectivo', tarjeta: 'Tarjeta', mercadopago: 'Mercado Pago', stripe: 'Stripe', liga: 'Liga' };

function inTab(tab: Tab, b: Billing, st: BillingStatus) {
  if (tab === 'confirmar') return b.payments.some((p) => p.status === 'pendiente');
  if (tab === 'vencidos') return st === 'vencido' || st === 'suspendido';
  return st === tab;
}

/**
 * Mensualidades: quién pagó, quién debe y quién avisó que ya pagó.
 * Las reglas corren solas en la base todos los días (aviso, gracia y baja a Estándar).
 */
export default function AdminMensualidades() {
  const { state, actions } = useApp();
  const [tab, setTab] = useState<Tab>('confirmar');
  const [registering, setRegistering] = useState<string | null>(null);

  const rows = BUSINESSES.map((b) => {
    const bill = state.billing[b.slug] ?? { plan: 'estandar' as PlanId, payments: [] };
    return { b, bill, st: billingStatus(bill) };
  });
  const count = (t: Tab) => rows.filter((r) => inTab(t, r.bill, r.st)).length;
  const now = new Date();
  const paidThisMonth = rows
    .flatMap((r) => r.bill.payments)
    .filter((p) => p.status === 'pagado' && new Date(p.createdAt).getMonth() === now.getMonth() && new Date(p.createdAt).getFullYear() === now.getFullYear())
    .reduce((a, p) => a + p.amount, 0);
  const pending = rows.flatMap((r) => r.bill.payments.filter((p) => p.status === 'pendiente'));
  const mrr = rows.filter((r) => r.st !== 'suspendido' && r.st !== 'gratis').reduce((a, r) => a + planById(r.bill.plan).price, 0);
  const overdue = rows.filter((r) => r.st === 'vencido' || r.st === 'suspendido');
  const overdueAmount = overdue.reduce((a, r) => a + planById(r.bill.plan).price, 0);
  const shown = rows.filter((r) => inTab(tab, r.bill, r.st)).sort((x, y) => daysLeft(x.bill.paidUntil) - daysLeft(y.bill.paidUntil));

  return (
    <AdminShell title="Mensualidades" subtitle="Quién pagó, quién debe y quién avisó que ya pagó">
      <View style={styles.kpis}>
        <Kpi label="Cobrado este mes" value={money(paidThisMonth)} tone="ok" />
        <Kpi label="Ingreso mensual de planes" value={money(mrr)} />
        <Kpi label="Por confirmar" value={`${pending.length} · ${money(pending.reduce((a, p) => a + p.amount, 0))}`} tone={pending.length ? 'warn' : undefined} />
        <Kpi label="Vencidos" value={`${overdue.length} · ${money(overdueAmount)}/mes`} tone={overdue.length ? 'bad' : undefined} />
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <Pressable key={t.id} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setTab(t.id)} style={[styles.tab, on && styles.tabOn]}>
              <Text style={[styles.tabText, on && { color: Brand.white }]}>
                {t.label} ({count(t.id)})
              </Text>
            </Pressable>
          );
        })}
      </View>

      {shown.length === 0 ? (
        <AdminCard>
          <Text style={styles.sub}>{tab === 'confirmar' ? 'Nadie está esperando confirmación. Todo al día.' : 'No hay negocios en esta lista.'}</Text>
        </AdminCard>
      ) : null}

      {shown.map(({ b, bill, st }) => {
        const plan = planById(bill.plan);
        const left = daysLeft(bill.paidUntil);
        const ui = STATUS_UI[st];
        const pend = bill.payments.filter((p) => p.status === 'pendiente');
        const last = bill.payments.find((p) => p.status === 'pagado');
        return (
          <AdminCard key={b.slug} style={{ gap: 10 }}>
            <View style={styles.rowTop}>
              <View style={{ flex: 1, minWidth: 200 }}>
                <Text style={styles.name}>{b.name}</Text>
                <Text style={styles.sub}>
                  {plan.name}
                  {plan.price ? ` · ${money(plan.price)}/mes` : ''}
                  {activePlan(bill) !== bill.plan ? ' · hoy se muestra como Estándar' : ''}
                </Text>
                {bill.paidUntil ? (
                  <Text style={styles.sub}>
                    Pagado hasta {niceDate(bill.paidUntil)} · {left > 0 ? `quedan ${left} días` : left === 0 ? 'vence hoy' : `venció hace ${-left} días`}
                  </Text>
                ) : null}
                {last ? (
                  <Text style={styles.small}>
                    Último pago: {money(last.amount)} · {METHOD[last.method]} · {new Date(last.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                  </Text>
                ) : null}
              </View>
              <Chip label={ui.label} color={ui.bg} ink={ui.fg} />
            </View>

            {pend.map((p) => (
              <Pending key={p.id} p={p} onConfirm={() => actions.confirmSubPayment(b.slug, p.id)} onReject={() => actions.rejectSubPayment(b.slug, p.id)} />
            ))}

            {registering === b.slug ? (
              <View style={styles.register}>
                <Text style={styles.name}>Registrar pago recibido</Text>
                <Text style={styles.small}>Para cuando te paga en efectivo o por depósito y no avisó en la app.</Text>
                <View style={styles.wrap}>
                  {PLANS.filter((x) => x.price > 0).flatMap((pl) =>
                    MESES.map((m) => (
                      <Button
                        key={`${pl.id}-${m.months}`}
                        label={`${pl.name} · ${m.label} · ${money(pl.price * m.pay)}`}
                        small
                        variant="ghost"
                        onPress={() => {
                          actions.registerSubPayment(b.slug, pl.id, m.months, pl.price * m.pay, 'efectivo');
                          setRegistering(null);
                        }}
                      />
                    )),
                  )}
                </View>
                <Button label="Cancelar" small variant="ghost" onPress={() => setRegistering(null)} />
              </View>
            ) : (
              <View style={styles.wrap}>
                {st === 'por_vencer' || st === 'vencido' || st === 'suspendido' ? (
                  <Button
                    label="Recordarle por WhatsApp"
                    small
                    icon="logo-whatsapp"
                    onPress={() =>
                      openWhatsApp(
                        st === 'por_vencer'
                          ? `Hola, ${b.name}. Tu plan ${plan.name} de Expertalia 360 vence el ${niceDate(bill.paidUntil)}. Para seguir apareciendo destacado, paga ${money(plan.price)} desde la app en Más → Mi plan. ¡Gracias!`
                          : `Hola, ${b.name}. Tu plan ${plan.name} de Expertalia 360 venció el ${niceDate(bill.paidUntil)}. ${st === 'suspendido' ? 'Tu perfil sigue visible, pero ya está como Estándar.' : `Tienes hasta ${DIAS_GRACIA} días de gracia antes de bajar a Estándar.`} Puedes pagar desde la app en Más → Mi plan.`,
                        b.phone,
                      )
                    }
                  />
                ) : null}
                <Button label="Registrar pago recibido" small variant="ghost" icon="add" onPress={() => setRegistering(b.slug)} />
              </View>
            )}
          </AdminCard>
        );
      })}

      <AdminCard style={{ gap: 6, backgroundColor: '#13203F' }}>
        <Text style={[styles.name, { color: '#E3B04B' }]}>Lo que pasa solo, todos los días a las 6:00</Text>
        <Text style={styles.rule}>• Faltan {DIAS_AVISO} días o menos: queda “Por vencer” y al negocio le sale un aviso en su panel para pagar.</Text>
        <Text style={styles.rule}>• Se le pasó la fecha: queda “Vencido” con {DIAS_GRACIA} días de gracia; sigue con su plan y el aviso se vuelve rojo.</Text>
        <Text style={styles.rule}>• Pasan los {DIAS_GRACIA} días: baja a Estándar (gratis). Sigue visible en el directorio, pero pierde lo de su plan.</Text>
        <Text style={styles.rule}>• Avisa que pagó: te aparece en “Por confirmar” con su comprobante. Al confirmar, la fecha se recorre sola y regresa a su plan.</Text>
      </AdminCard>

      <View style={styles.kpis}>
        {PLANS.map((p) => (
          <AdminCard key={p.id} style={{ flexGrow: 1, flexBasis: 200, gap: 4 }}>
            <Text style={styles.name}>{p.name}</Text>
            <Text style={styles.price}>{p.price ? `${money(p.price)}/mes` : 'Gratis'}</Text>
            <Text style={styles.small}>{p.features.join(' · ')}</Text>
            <Chip label={`${rows.filter((r) => activePlan(r.bill) === p.id).length} negocios`} />
          </AdminCard>
        ))}
      </View>
    </AdminShell>
  );
}

function Pending({ p, onConfirm, onReject }: { p: SubPayment; onConfirm: () => void; onReject: () => void }) {
  return (
    <View style={styles.pending}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <View style={{ flex: 1, minWidth: 180 }}>
          <Text style={styles.name}>
            Avisó que pagó {money(p.amount)} · {planById(p.plan).name} · {p.months === 1 ? '1 mes' : `${p.months} meses`}
          </Text>
          <Text style={styles.sub}>
            {METHOD[p.method]}
            {p.reference ? ` · ref. ${p.reference}` : ''} · {new Date(p.createdAt).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Text style={styles.small}>Revisa que el dinero esté en tu cuenta antes de confirmar.</Text>
        </View>
        {p.receipt ? (
          <Pressable accessibilityRole="link" accessibilityLabel="Ver comprobante" onPress={() => Linking.openURL(p.receipt!)}>
            <Image source={{ uri: p.receipt }} style={styles.receipt} contentFit="cover" />
          </Pressable>
        ) : (
          <Chip label="Sin comprobante" />
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button label="No llegó" small variant="ghost" style={{ flex: 1 }} onPress={onReject} />
        <Button label="Confirmar pago" small variant="success" icon="checkmark" style={{ flex: 1.6 }} onPress={onConfirm} />
      </View>
    </View>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'warn' | 'bad' }) {
  const bg = tone === 'ok' ? '#DDF3E8' : tone === 'warn' ? '#FFF1CC' : tone === 'bad' ? '#FDE2E2' : Brand.white;
  return (
    <AdminCard style={{ flexGrow: 1, flexBasis: 160, backgroundColor: bg, gap: 2 }}>
      <Text style={styles.small}>{label}</Text>
      <Text style={styles.kpi}>{value}</Text>
    </AdminCard>
  );
}

const styles = StyleSheet.create({
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: { fontSize: 20, fontWeight: '800', color: Brand.ink },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Brand.white, borderWidth: 1, borderColor: Brand.line },
  tabOn: { backgroundColor: Brand.ink, borderColor: Brand.ink },
  tabText: { fontSize: 13, fontWeight: '700', color: Brand.ink },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' },
  name: { fontSize: 15, fontWeight: '800', color: Brand.ink },
  sub: { fontSize: 13, color: Brand.inkSoft, marginTop: 2 },
  small: { fontSize: 12, color: Brand.inkSoft, lineHeight: 17 },
  price: { fontSize: 22, fontWeight: '800', color: Brand.chile },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pending: { backgroundColor: '#FFF7E0', borderRadius: Radius.md, padding: 12, gap: 10, borderWidth: 1, borderColor: '#F0D58C' },
  receipt: { width: 64, height: 64, borderRadius: 10, backgroundColor: Brand.line },
  register: { backgroundColor: Brand.tortilla, borderRadius: Radius.md, padding: 12, gap: 8 },
  rule: { fontSize: 13, color: '#E3E8EF', lineHeight: 19 },
});
