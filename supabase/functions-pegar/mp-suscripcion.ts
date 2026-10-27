// Expertalia 360 · mp-suscripcion (versión de un solo archivo para pegar en el editor de Supabase)
// Generado por supabase/build-functions.py; el original está en supabase/functions/mp-suscripcion/index.ts

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

// ───────────── mp-suscripcion ─────────────
// Expertalia 360 · mp-suscripcion
// El negocio toca "Pagar con tarjeta" en Mi plan → esta función crea su suscripción mensual en
// Mercado Pago (el monto sale del plan y del mundo: profesionistas u oficios) y regresa la liga
// donde mete su tarjeta. Desde ahí, Mercado Pago cobra cada mes y avisa a mp-webhook.
//
// POST { action: "crear", plan: "estandar" | "premium" | "vip", email?: string }  → { url }
// POST { action: "cancelar" }                                                    → { ok: true }
// Requiere la sesión del dueño (Authorization: Bearer <token de la app>).

const PLAN_NAME: Record<string, string> = { estandar: 'Estándar', premium: 'Premium', vip: 'VIP' };

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Usa POST' }, 405);
  try {
    const db = adminClient();
    const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: auth } = await db.auth.getUser(token);
    const user = auth?.user;
    if (!user) return json({ error: 'Entra con tu correo para pagar' }, 401);

    const body = await req.json().catch(() => ({}));
    const { data: biz } = await db
      .from('businesses')
      .select('id, slug, name, plan, mp_preapproval_id, mp_status, categories ( world )')
      .eq('owner_id', user.id)
      .order('created_at')
      .limit(1)
      .maybeSingle();
    if (!biz) return json({ error: 'Primero crea tu perfil profesional' }, 404);

    // Cancelar el cobro automático
    if (body.action === 'cancelar') {
      if (biz.mp_preapproval_id && biz.mp_status !== 'cancelado') {
        await mp('PUT', `/preapproval/${biz.mp_preapproval_id}`, { status: 'cancelled' });
      }
      await db.from('businesses').update({ mp_status: 'cancelado' }).eq('id', biz.id);
      return json({ ok: true });
    }

    const plan = String(body.plan ?? '');
    if (!PLAN_NAME[plan]) return json({ error: 'Plan no válido' }, 400);
    const { data: p } = await db.from('plans').select('monthly_price, monthly_price_oficios').eq('id', plan).single();
    const world = (biz.categories as { world?: string } | null)?.world;
    const amount = Number(world === 'oficios' ? p!.monthly_price_oficios : p!.monthly_price);

    // Si ya tenía otra suscripción (cambio de plan), se cancela para no cobrarle doble
    if (biz.mp_preapproval_id && ['pendiente', 'activo', 'pausado'].includes(biz.mp_status ?? '')) {
      await mp('PUT', `/preapproval/${biz.mp_preapproval_id}`, { status: 'cancelled' }).catch((e) => console.warn(e.message));
    }

    const payerEmail = String(body.email || user.email || '').trim();
    const pre = await mp<{ id: string; init_point: string; status: string }>('POST', '/preapproval', {
      reason: `Expertalia 360 · Plan ${PLAN_NAME[plan]} · ${biz.name}`.slice(0, 120),
      external_reference: biz.id,
      payer_email: payerEmail,
      auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: amount, currency_id: 'MXN' },
      back_url: `${APP_URL()}?plan=1`,
      status: 'pending',
    });
    await db
      .from('businesses')
      .update({ mp_preapproval_id: pre.id, mp_status: MP_STATUS[pre.status] ?? 'pendiente', mp_plan: plan })
      .eq('id', biz.id);
    return json({ url: pre.init_point, amount });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
}

// En pruebas locales solo se importa el handler
if (!Deno.env.get('EXPERTALIA_TEST')) Deno.serve(handler);
