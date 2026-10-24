import type { PaymentMethod } from './types';

/** Planes mensuales (mismos que la tabla public.plans). */
export type PlanId = 'basico' | 'plata' | 'oro';
export const PLANS: { id: PlanId; name: string; price: number; features: string[] }[] = [
  { id: 'basico', name: 'Básico', price: 0, features: ['Perfil con fotos y especialidades', 'Pin en el mapa', 'Reseñas y agenda', 'Hasta 5 servicios'] },
  { id: 'plata', name: 'Plata', price: 399, features: ['Todo lo de Básico', 'Servicios y paquetes ilimitados', 'Sales antes en las búsquedas', 'Muro y 3 promociones al mes', 'Estadísticas de tu perfil'] },
  { id: 'oro', name: 'Oro', price: 799, features: ['Todo lo de Plata', 'Destacado en tu especialidad', 'Campañas a tus clientes', 'Varios colaboradores', '10% de descuento en espacios'] },
];
export const planById = (id: PlanId) => PLANS.find((p) => p.id === id)!;

/** Reglas automáticas: aviso antes de vencer y días de gracia antes de bajar a Básico. */
export const DIAS_AVISO = 5;
export const DIAS_GRACIA = 7;
/** Pagar 12 meses: se cobran 10 */
export const MESES: { months: number; label: string; pay: number }[] = [
  { months: 1, label: '1 mes', pay: 1 },
  { months: 3, label: '3 meses', pay: 3 },
  { months: 12, label: '12 meses (2 gratis)', pay: 10 },
];

export type BillingStatus = 'gratis' | 'al_corriente' | 'por_vencer' | 'vencido' | 'suspendido';
export type SubPayment = {
  id: string;
  plan: PlanId;
  months: number;
  amount: number;
  method: PaymentMethod | 'deposito';
  reference?: string;
  receipt?: string;
  status: 'pendiente' | 'pagado' | 'rechazado';
  createdAt: number;
  periodEnd?: string;
};
export type Billing = {
  /** Plan que pagó (si está suspendido, se usa Básico mientras tanto) */
  plan: PlanId;
  /** AAAA-MM-DD; sin fecha = Básico gratis */
  paidUntil?: string;
  payments: SubPayment[];
};

const DAY = 86400000;
export const today = () => new Date(new Date().toDateString());
export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parseDate = (s: string) => new Date(`${s}T00:00:00`);
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
export function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}
export const daysLeft = (paidUntil?: string) => (paidUntil ? Math.round((parseDate(paidUntil).getTime() - today().getTime()) / DAY) : 0);
export const niceDate = (s?: string) => (s ? parseDate(s).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/** Igual que public.billing_status en la base de datos */
export function billingStatus(b: Pick<Billing, 'plan' | 'paidUntil'>): BillingStatus {
  if (b.plan === 'basico' && !b.paidUntil) return 'gratis';
  if (!b.paidUntil) return 'vencido';
  const left = daysLeft(b.paidUntil);
  if (left > DIAS_AVISO) return 'al_corriente';
  if (left >= 0) return 'por_vencer';
  if (-left <= DIAS_GRACIA) return 'vencido';
  return 'suspendido';
}

/** Plan con el que se muestra hoy (suspendido = Básico) */
export const activePlan = (b: Billing): PlanId => (billingStatus(b) === 'suspendido' ? 'basico' : b.plan);

export const STATUS_UI: Record<BillingStatus, { label: string; bg: string; fg: string }> = {
  gratis: { label: 'Plan gratis', bg: '#E8ECF3', fg: '#3D4760' },
  al_corriente: { label: 'Al corriente', bg: '#DDF3E8', fg: '#0C6B47' },
  por_vencer: { label: 'Por vencer', bg: '#FFF1CC', fg: '#7A5600' },
  vencido: { label: 'Vencido · en gracia', bg: '#FDE2E2', fg: '#A32020' },
  suspendido: { label: 'Suspendido · bajó a Básico', bg: '#2B2B2B', fg: '#FFFFFF' },
};

/**
 * Mensualidades de ejemplo para los 18 expertos (también las usa el generador de datos de Supabase),
 * repartidas para que se vea cada caso: al corriente, por vencer, vencido, suspendido y por confirmar.
 */
const DEMO_PLAN: PlanId[] = ['oro', 'plata', 'plata', 'basico', 'plata', 'oro', 'plata', 'basico', 'plata', 'plata', 'basico', 'plata', 'oro', 'plata', 'basico', 'plata', 'plata', 'basico'];
const DEMO_OFFSET = [24, 3, -4, 0, 17, 9, -12, 0, 2, 28, 0, -2, 40, 12, 0, 6, 21, 0];
export function demoBilling(slugs: string[]): Record<string, Billing> {
  const out: Record<string, Billing> = {};
  slugs.forEach((slug, i) => {
    const plan = DEMO_PLAN[i % DEMO_PLAN.length];
    const off = DEMO_OFFSET[i % DEMO_OFFSET.length];
    const paidUntil = plan === 'basico' ? undefined : isoDate(addDays(today(), off));
    const price = planById(plan).price;
    const payments: SubPayment[] =
      plan === 'basico'
        ? []
        : [{ id: `sp-${i}-1`, plan, months: 1, amount: price, method: i % 2 ? 'transferencia' : 'deposito', reference: `SPEI ${7300 + i * 37}`, status: 'pagado', createdAt: addDays(today(), off - 31).getTime(), periodEnd: paidUntil }];
    // Dos negocios ya avisaron que pagaron y esperan tu confirmación
    if (i === 2 || i === 11) payments.unshift({ id: `sp-${i}-2`, plan, months: i === 2 ? 3 : 1, amount: price * (i === 2 ? 3 : 1), method: 'transferencia', reference: `SPEI ${9100 + i}`, status: 'pendiente', createdAt: Date.now() - (i + 2) * 3600000 });
    out[slug] = { plan, paidUntil, payments };
  });
  return out;
}
