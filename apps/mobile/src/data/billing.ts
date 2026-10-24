import type { PaymentMethod } from './types';

/** Planes mensuales (mismos que la tabla public.plans). */
export type PlanId = 'estandar' | 'premium' | 'vip';
export const PLANS: { id: PlanId; name: string; price: number; features: string[] }[] = [
  { id: 'estandar', name: 'Estándar', price: 199, features: ['Perfil con fotos y especialidades', 'Pin en el mapa', 'Reseñas y agenda', 'Hasta 5 servicios'] },
  { id: 'premium', name: 'Premium', price: 399, features: ['Todo lo de Estándar', 'Servicios y paquetes ilimitados', 'Sales antes en las búsquedas', 'Muro y 3 promociones al mes', 'Estadísticas de tu perfil'] },
  { id: 'vip', name: 'VIP', price: 799, features: ['Todo lo de Premium', 'Primero en tu especialidad', 'Campañas a tus clientes', 'Varios colaboradores', '10% de descuento en espacios'] },
];
export const planById = (id: PlanId) => PLANS.find((p) => p.id === id)!;

/** Cuántas categorías puede tener cada plan (la principal cuenta) */
export const CATEGORY_LIMIT: Record<PlanId, number> = { estandar: 1, premium: 3, vip: 6 };

/** Reglas automáticas: prueba al registrarse, aviso antes de vencer y días de gracia antes de ocultar el perfil. */
export const DIAS_PRUEBA = 30;
export const DIAS_AVISO = 5;
export const DIAS_GRACIA = 7;
/** Pagar 12 meses: se cobran 10 */
export const MESES: { months: number; label: string; pay: number }[] = [
  { months: 1, label: '1 mes', pay: 1 },
  { months: 3, label: '3 meses', pay: 3 },
  { months: 12, label: '12 meses (2 gratis)', pay: 10 },
];

export type BillingStatus = 'prueba' | 'al_corriente' | 'por_vencer' | 'vencido' | 'suspendido';
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
  plan: PlanId;
  /** AAAA-MM-DD hasta donde está pagado (o hasta donde dura su prueba) */
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

/** Igual que public.billing_status en la base de datos. "prueba" = aún no hace su primer pago. */
export function billingStatus(b: Pick<Billing, 'plan' | 'paidUntil'> & { payments?: SubPayment[] }): BillingStatus {
  if (!b.paidUntil) return 'suspendido';
  const left = daysLeft(b.paidUntil);
  const trial = b.payments ? !b.payments.some((p) => p.status === 'pagado') : false;
  if (left > DIAS_AVISO) return trial ? 'prueba' : 'al_corriente';
  if (left >= 0) return 'por_vencer';
  if (-left <= DIAS_GRACIA) return 'vencido';
  return 'suspendido';
}

/** Plan con sus beneficios (si está suspendido, igual no aparece en el directorio) */
export const activePlan = (b: Billing): PlanId => b.plan;

/** Registro de un perfil nuevo: Estándar con 30 días de prueba */
export const newBilling = (): Billing => ({ plan: 'estandar', paidUntil: isoDate(addDays(today(), DIAS_PRUEBA)), payments: [] });

export const STATUS_UI: Record<BillingStatus, { label: string; bg: string; fg: string }> = {
  prueba: { label: 'En prueba', bg: '#E3ECFB', fg: '#1B3F7A' },
  al_corriente: { label: 'Al corriente', bg: '#DDF3E8', fg: '#0C6B47' },
  por_vencer: { label: 'Por vencer', bg: '#FFF1CC', fg: '#7A5600' },
  vencido: { label: 'Vencido · en gracia', bg: '#FDE2E2', fg: '#A32020' },
  suspendido: { label: 'Suspendido · oculto', bg: '#2B2B2B', fg: '#FFFFFF' },
};

/**
 * Mensualidades de ejemplo para los 18 expertos (también las usa el generador de datos de Supabase),
 * repartidas para que se vea cada caso: al corriente, por vencer, vencido, suspendido y por confirmar.
 */
const DEMO_PLAN: PlanId[] = ['vip', 'premium', 'premium', 'estandar', 'premium', 'vip', 'premium', 'estandar', 'premium', 'premium', 'estandar', 'premium', 'vip', 'premium', 'estandar', 'premium', 'premium', 'estandar'];
const DEMO_OFFSET = [24, 3, -4, 0, 17, 9, -12, 0, 2, 28, 0, -2, 40, 12, 0, 6, 21, 0];
export function demoBilling(slugs: string[]): Record<string, Billing> {
  const out: Record<string, Billing> = {};
  slugs.forEach((slug, i) => {
    const plan = DEMO_PLAN[i % DEMO_PLAN.length];
    const off = DEMO_OFFSET[i % DEMO_OFFSET.length];
    // Los índices 3 y 10 están en su prueba de 30 días (aún no pagan)
    const trial = i === 3 || i === 10;
    const days = trial ? 18 + i : off || 15 + i;
    const paidUntil = isoDate(addDays(today(), days));
    const price = planById(plan).price;
    const payments: SubPayment[] =
      trial
        ? []
        : [{ id: `sp-${i}-1`, plan, months: 1, amount: price, method: i % 2 ? 'transferencia' : 'deposito', reference: `SPEI ${7300 + i * 37}`, status: 'pagado', createdAt: addDays(today(), days - 31).getTime(), periodEnd: paidUntil }];
    // Dos negocios ya avisaron que pagaron y esperan tu confirmación
    if (i === 2 || i === 11) payments.unshift({ id: `sp-${i}-2`, plan, months: i === 2 ? 3 : 1, amount: price * (i === 2 ? 3 : 1), method: 'transferencia', reference: `SPEI ${9100 + i}`, status: 'pendiente', createdAt: Date.now() - (i + 2) * 3600000 });
    out[slug] = { plan, paidUntil, payments };
  });
  return out;
}
