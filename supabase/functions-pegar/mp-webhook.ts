// Expertalia 360 · mp-webhook (versión de un solo archivo para pegar en el editor de Supabase)
// Generado por supabase/build-functions.py; el original está en supabase/functions/mp-webhook/index.ts

// Utilidades compartidas por las funciones de Expertalia 360 (Supabase Edge Functions, Deno).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4';

export const env = (k: string, fallback = '') => Deno.env.get(k) ?? fallback;

/** Dirección pública de la app (a donde regresa la persona después de pagar y la que va en los correos). */
export const APP_URL = () => env('APP_URL', 'https://msmejoraprocesos.github.io/Empresalia360/');

/** Cliente con la llave de servicio: solo existe dentro de la función, nunca en la app. */
export function adminClient(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } });
}

export const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, GET, OPTIONS',
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...cors } });
}

// ───────────── Mercado Pago ─────────────
const MP_API = () => env('MP_API_BASE', 'https://api.mercadopago.com');

export async function mp<T = Record<string, unknown>>(method: string, path: string, body?: unknown): Promise<T> {
  const token = env('MP_ACCESS_TOKEN');
  if (!token) throw new Error('Falta MP_ACCESS_TOKEN en los secretos de la función');
  const r = await fetch(`${MP_API()}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  const data = text ? JSON.parse(text) : {};
  if (!r.ok) throw new Error(`Mercado Pago ${r.status}: ${data.message ?? text}`);
  return data as T;
}

/**
 * Revisa la firma x-signature que manda Mercado Pago en cada aviso.
 * Plantilla oficial: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" firmada con HMAC-SHA256 y la clave secreta del webhook.
 */
export async function validMpSignature(req: Request, dataId: string, secret: string): Promise<boolean> {
  const sig = req.headers.get('x-signature') ?? '';
  const requestId = req.headers.get('x-request-id') ?? '';
  const parts = Object.fromEntries(sig.split(',').map((p) => p.trim().split('=') as [string, string]));
  if (!parts.ts || !parts.v1) return false;
  let manifest = '';
  if (dataId) manifest += `id:${/^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${parts.ts};`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest)));
  const hex = Array.from(mac, (b) => b.toString(16).padStart(2, '0')).join('');
  return hex === parts.v1;
}

/** Estado de la suscripción de Mercado Pago → como lo guardamos */
export const MP_STATUS: Record<string, string> = { pending: 'pendiente', authorized: 'activo', paused: 'pausado', cancelled: 'cancelado' };

// ───────────── Correo (Brevo) ─────────────
export async function sendEmail(to: { email: string; name?: string }, subject: string, html: string): Promise<boolean> {
  const key = env('BREVO_API_KEY');
  if (!key) {
    console.log(`[sin BREVO_API_KEY] correo a ${to.email}: ${subject}`);
    return false;
  }
  const r = await fetch(`${env('BREVO_API_BASE', 'https://api.brevo.com')}/v3/smtp/email`, {
    method: 'POST',
    headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Expertalia 360', email: env('AVISOS_REMITENTE') },
      to: [to],
      subject,
      htmlContent: html,
    }),
  });
  if (!r.ok) console.error(`Brevo ${r.status}: ${await r.text()}`);
  return r.ok;
}

export const money = (n: number) => `$${Math.round(n).toLocaleString('es-MX')}`;
export const niceDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Mexico_City' });

// ───────────── mp-webhook ─────────────
// Expertalia 360 · mp-webhook
// Mercado Pago avisa aquí cada vez que cambia una suscripción o cobra una mensualidad.
//   subscription_preapproval          → se guarda el estado (activa, pausada, cancelada)
//   subscription_authorized_payment   → si el cobro se aprobó, se registra el pago y la fecha se recorre un mes
// Se configura en Mercado Pago → Tus integraciones → Webhooks, con la URL de esta función
// y los eventos "Planes y suscripciones". La clave secreta que te dan va en MP_WEBHOOK_SECRET.

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
