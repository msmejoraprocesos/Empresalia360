// Expertalia 360 · mp-suscripcion
// El negocio toca "Pagar con tarjeta" en Mi plan → esta función crea su suscripción mensual en
// Mercado Pago (el monto sale del plan y del mundo: profesionistas u oficios) y regresa la liga
// donde mete su tarjeta. Desde ahí, Mercado Pago cobra cada mes y avisa a mp-webhook.
//
// POST { action: "crear", plan: "estandar" | "premium" | "vip", email?: string }  → { url }
// POST { action: "cancelar" }                                                    → { ok: true }
// Requiere la sesión del dueño (Authorization: Bearer <token de la app>).
import { adminClient, APP_URL, cors, json, mp, MP_STATUS } from '../_shared/util.ts';

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
