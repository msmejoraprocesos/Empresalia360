// Expertalia 360 · mp-webhook
// Mercado Pago avisa aquí cada vez que cambia una suscripción o cobra una mensualidad.
//   subscription_preapproval          → se guarda el estado (activa, pausada, cancelada)
//   subscription_authorized_payment   → si el cobro se aprobó, se registra el pago y la fecha se recorre un mes
// Se configura en Mercado Pago → Tus integraciones → Webhooks, con la URL de esta función
// y los eventos "Planes y suscripciones". La clave secreta que te dan va en MP_WEBHOOK_SECRET.
import { adminClient, env, json, mp, MP_STATUS, validMpSignature } from '../_shared/util.ts';

type Preapproval = { id: string; status: string; external_reference?: string; reason?: string };
type AuthorizedPayment = {
  id: number | string;
  preapproval_id: string;
  status: string;
  transaction_amount: number;
  date_created?: string;
  debit_date?: string;
  payment?: { id?: number | string; status?: string };
};

export async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ ok: true });
  const url = new URL(req.url);
  const body = await req.json().catch(() => ({}));
  const type = String(body.type ?? body.topic ?? url.searchParams.get('type') ?? url.searchParams.get('topic') ?? '');
  const dataId = String(url.searchParams.get('data.id') ?? body.data?.id ?? body.id ?? '');

  const secret = env('MP_WEBHOOK_SECRET');
  if (secret && !(await validMpSignature(req, dataId, secret))) return json({ error: 'Firma no válida' }, 401);
  if (!dataId) return json({ ok: true, ignorado: 'sin id' });

  try {
    const db = adminClient();
    if (type === 'subscription_preapproval') {
      const pre = await mp<Preapproval>('GET', `/preapproval/${dataId}`);
      const status = MP_STATUS[pre.status] ?? 'pendiente';
      let { data } = await db.from('businesses').update({ mp_status: status }).eq('mp_preapproval_id', pre.id).select('id');
      // Si la suscripción todavía no estaba ligada (raro), se liga por la referencia = id del negocio
      if (!data?.length && pre.external_reference) {
        ({ data } = await db.from('businesses').update({ mp_preapproval_id: pre.id, mp_status: status }).eq('id', pre.external_reference).select('id'));
      }
      return json({ ok: true, estado: status, negocios: data?.length ?? 0 });
    }

    if (type === 'subscription_authorized_payment') {
      const ap = await mp<AuthorizedPayment>('GET', `/authorized_payments/${dataId}`);
      const approved = ap.payment?.status === 'approved';
      if (!approved) return json({ ok: true, cobro: ap.status, pago: ap.payment?.status ?? null });
      const { data, error } = await db.rpc('apply_mp_payment', {
        p_preapproval: ap.preapproval_id,
        p_amount: ap.transaction_amount,
        p_external_id: String(ap.payment?.id ?? ap.id),
        p_paid_at: ap.debit_date ?? ap.date_created ?? new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
      return json({ ok: true, pagado_hasta: data });
    }

    return json({ ok: true, ignorado: type });
  } catch (e) {
    console.error(e);
    // 500 → Mercado Pago vuelve a intentar más tarde
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
}

// En pruebas locales solo se importa el handler
if (!Deno.env.get('EXPERTALIA_TEST')) Deno.serve(handler);
