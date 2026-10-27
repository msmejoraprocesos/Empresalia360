// Expertalia 360 · avisos-mensualidades
// Se corre una vez al día (Supabase → Integrations → Cron). Hace tres cosas:
//   1. Pone al día el estado de todos (refresh_billing): por vencer, vencido, oculto.
//   2. Manda correo a cada negocio que lo necesita, una sola vez por fecha:
//        aviso  → faltan 5 días o menos (no a quien paga con tarjeta automática)
//        vencio → ya se pasó la fecha (tiene 7 días de gracia)
//        oculto → su perfil dejó de aparecer en el directorio
//   3. Te manda a ti (ADMIN_EMAIL) un resumen: quién vence, quién debe y pagos por confirmar.
// Protegida con el encabezado x-cron-secret = CRON_SECRET.
import { adminClient, APP_URL, env, json, money, niceDate, sendEmail } from '../_shared/util.ts';

type Row = { business_id: string; slug: string; name: string; email: string; owner_name: string | null; kind: 'aviso' | 'vencio' | 'oculto'; paid_until: string; plan: string; price: number; auto: boolean };
const PLAN: Record<string, string> = { estandar: 'Estándar', premium: 'Premium', vip: 'VIP' };

function layout(title: string, body: string, cta: string) {
  return `<!doctype html><html><body style="margin:0;background:#F2ECE2;font-family:Arial,Helvetica,sans-serif;color:#13203F">
<div style="max-width:520px;margin:0 auto;padding:24px">
  <div style="background:#13203F;color:#fff;border-radius:16px 16px 0 0;padding:18px 22px;font-weight:800;font-size:20px">Expertalia <span style="color:#E3B04B">360</span></div>
  <div style="background:#fff;border-radius:0 0 16px 16px;padding:22px">
    <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
    <div style="font-size:15px;line-height:1.5">${body}</div>
    <p style="margin:22px 0 6px"><a href="${APP_URL()}?plan=1" style="background:#C9A13B;color:#13203F;text-decoration:none;font-weight:800;padding:12px 20px;border-radius:999px;display:inline-block">${cta}</a></p>
    <p style="font-size:12px;color:#6B7385;margin-top:18px">En la app: Más → Mi plan. Puedes pagar con tarjeta (se cobra solo cada mes) o por transferencia.</p>
  </div>
</div></body></html>`;
}

function message(r: Row): { subject: string; html: string } {
  const hola = `Hola${r.owner_name ? `, ${r.owner_name.split(' ')[0]}` : ''}.`;
  const plan = `${PLAN[r.plan] ?? r.plan} (${money(r.price)} al mes)`;
  if (r.kind === 'aviso')
    return {
      subject: `Tu plan de Expertalia 360 vence el ${niceDate(r.paid_until)}`,
      html: layout('Tu plan está por vencer', `<p>${hola}</p><p>El plan ${plan} de <b>${r.name}</b> vence el <b>${niceDate(r.paid_until)}</b>. Paga a tiempo para seguir apareciendo a tus clientes.</p><p>Tip: con tarjeta se cobra solo cada mes y no te vuelve a llegar este aviso.</p>`, 'Pagar mi mensualidad'),
    };
  if (r.kind === 'vencio')
    return {
      subject: 'Tu plan de Expertalia 360 venció: tienes 7 días de gracia',
      html: layout('Tu plan venció', `<p>${hola}</p><p>El plan ${plan} de <b>${r.name}</b> venció el <b>${niceDate(r.paid_until)}</b>. Sigues apareciendo 7 días más; si no se recibe tu pago, tu perfil se oculta del directorio.</p>`, 'Pagar ahora'),
    };
  return {
    subject: 'Tu perfil en Expertalia 360 ya no aparece',
    html: layout('Tu perfil se ocultó', `<p>${hola}</p><p><b>${r.name}</b> ya no aparece en búsquedas, categorías ni en el mapa porque no recibimos tu pago. Tus datos y reseñas están guardados: en cuanto pagues, vuelves a aparecer.</p>`, 'Volver a aparecer'),
  };
}

export async function handler(req: Request): Promise<Response> {
  const secret = env('CRON_SECRET');
  if (!secret || req.headers.get('x-cron-secret') !== secret) return json({ error: 'No autorizado' }, 401);
  const db = adminClient();
  const dryRun = new URL(req.url).searchParams.has('prueba');

  const { error: e1 } = await db.rpc('refresh_billing');
  if (e1) return json({ error: e1.message }, 500);
  const { data, error } = await db.rpc('billing_notice_queue');
  if (error) return json({ error: error.message }, 500);
  const rows = (data ?? []) as Row[];

  const sent: { slug: string; kind: string; ok: boolean }[] = [];
  for (const r of rows) {
    const m = message(r);
    const ok = dryRun ? false : await sendEmail({ email: r.email, name: r.owner_name ?? r.name }, m.subject, m.html);
    // Se anota aunque no haya Brevo configurado, para no repetir el aviso al día siguiente
    if (!dryRun) await db.from('billing_notices').insert({ business_id: r.business_id, kind: r.kind, paid_until: r.paid_until, email: r.email });
    sent.push({ slug: r.slug, kind: r.kind, ok });
  }

  // Resumen para el administrador
  const admin = env('ADMIN_EMAIL');
  const { data: pend } = await db.from('subscription_payments').select('amount, businesses ( name )').eq('status', 'pendiente');
  const { data: biz } = await db.from('businesses').select('name, plan_status, paid_until, mp_status').eq('status', 'activo').in('plan_status', ['por_vencer', 'vencido', 'suspendido']).order('paid_until');
  const pendRows = (pend ?? []) as unknown as { amount: number; businesses: { name: string } | null }[];
  const bizRows = (biz ?? []) as { name: string; plan_status: string; paid_until: string; mp_status: string | null }[];
  if (admin && !dryRun && (pendRows.length || bizRows.length || rows.length)) {
    const li = (t: string) => `<li style="margin:4px 0">${t}</li>`;
    const label: Record<string, string> = { por_vencer: 'por vencer', vencido: 'vencido (en gracia)', suspendido: 'oculto' };
    const html = layout(
      'Resumen de mensualidades de hoy',
      `${pendRows.length ? `<p><b>${pendRows.length} pagos por confirmar</b> (${money(pendRows.reduce((a, p) => a + Number(p.amount), 0))}):</p><ul>${pendRows.map((p) => li(`${p.businesses?.name ?? '—'} · ${money(Number(p.amount))}`)).join('')}</ul>` : '<p>Sin pagos por confirmar.</p>'}
       ${bizRows.length ? `<p><b>Negocios que requieren atención:</b></p><ul>${bizRows.map((b) => li(`${b.name} · ${label[b.plan_status] ?? b.plan_status} · ${niceDate(b.paid_until)}${b.mp_status === 'activo' ? ' · tarjeta automática' : ''}`)).join('')}</ul>` : ''}
       <p>Correos enviados hoy a negocios: ${rows.length}.</p>`,
      'Abrir Expertalia 360',
    );
    await sendEmail({ email: admin }, `Expertalia 360 · ${pendRows.length} por confirmar, ${bizRows.length} por atender`, html);
  }

  return json({ ok: true, avisos: sent, por_confirmar: pendRows.length, por_atender: bizRows.length, prueba: dryRun });
}

// En pruebas locales solo se importa el handler
if (!Deno.env.get('EXPERTALIA_TEST')) Deno.serve(handler);
