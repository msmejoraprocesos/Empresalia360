import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AdminCard, AdminShell } from '@/components/admin-shell';
import { Button, Chip, EmptyState } from '@/components/ui';
import { Brand, Radius } from '@/constants/theme';
import { BUSINESSES, CATEGORIES, categoryName } from '@/data';
import { adminResolveClaim, adminUpdateBusiness, loadAdmin, type AdminBusiness, type AdminClaim } from '@/data/remote';
import { claimMessage, openWhatsApp } from '@/lib/links';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useApp } from '@/store/app';

type World = 'profesionales' | 'oficios';
const worldOfCat = (slug: string): World => (CATEGORIES.find((c) => c.slug === slug)?.group ?? 'profesionales') as World;

// Reclamo de ejemplo para la demostración (sin base conectada)
const DEMO_CLAIMS: AdminClaim[] = [
  { id: 'cl-demo', businessId: 'cerrajeria-llave-maestra', businessSlug: 'cerrajeria-llave-maestra', businessName: 'Cerrajería Llave Maestra', userName: 'Javier Torres', userEmail: 'javier.torres@correo.mx', note: 'Soy el dueño, mi WhatsApp es el mismo del perfil.', status: 'pendiente', createdAt: new Date().toISOString() },
];

/**
 * Negocios: altas que haces tú, reclamos de perfil, cédulas por verificar y todos los perfiles
 * (verificar, suspender o reactivar). Con la base conectada todo se guarda en Supabase.
 */
export default function AdminNegocios() {
  const { state, actions } = useApp();
  const router = useRouter();
  const [remote, setRemote] = useState<{ businesses: AdminBusiness[]; claims: AdminClaim[] } | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [q, setQ] = useState('');
  const [mundo, setMundo] = useState<'todos' | World>('todos');
  const [busy, setBusy] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const r = await loadAdmin();
    setRemote(r);
    setLoading(false);
  }, []);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    void loadAdmin().then((r) => {
      setRemote(r);
      setLoading(false);
    });
  }, []);

  // Demostración: se arma la misma lista con los perfiles de ejemplo
  const businesses: AdminBusiness[] = useMemo(
    () =>
      remote?.businesses ??
      BUSINESSES.map((b) => ({
        id: b.slug, slug: b.slug, name: b.name, categorySlug: b.categorySlug, zone: b.zone, verified: b.verified,
        status: (b.slug in SUSPENDED ? 'suspendido' : 'activo') as AdminBusiness['status'],
        license: b.license, owner: !b.claimable, byAdmin: Boolean(b.claimable), phone: b.phone, createdAt: '', hiddenUnpaid: false,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [remote, state.adminVersion, state.billing],
  );
  const claims = (remote?.claims ?? DEMO_CLAIMS).filter((c) => c.status === 'pendiente');
  const toVerify = businesses.filter((b) => !b.verified && b.status === 'activo' && b.owner);
  const ownerless = businesses.filter((b) => !b.owner);

  useEffect(() => {
    if (!loading) actions.setAdminPending(claims.length + toVerify.length);
  }, [loading, claims.length, toVerify.length, actions]);

  const t = q.trim().toLowerCase();
  const all = businesses.filter(
    (b) => (mundo === 'todos' || worldOfCat(b.categorySlug) === mundo) && (!t || b.name.toLowerCase().includes(t) || categoryName(b.categorySlug).toLowerCase().includes(t)),
  );

  async function setBiz(b: AdminBusiness, patch: { verified?: boolean; status?: AdminBusiness['status'] }) {
    setBusy(b.id);
    if (remote) {
      await adminUpdateBusiness(b.id, patch);
      await reload();
    } else {
      const local = BUSINESSES.find((x) => x.slug === b.slug);
      if (local && patch.verified !== undefined) local.verified = patch.verified;
      if (patch.status === 'suspendido') SUSPENDED[b.slug] = true;
      if (patch.status === 'activo') delete SUSPENDED[b.slug];
      actions.bumpAdmin();
    }
    setBusy(null);
  }

  async function resolve(c: AdminClaim, status: 'aprobada' | 'rechazada') {
    setBusy(c.id);
    if (remote) {
      await adminResolveClaim(c.id, status);
      await reload();
    } else {
      c.status = status;
      const local = BUSINESSES.find((x) => x.slug === c.businessSlug);
      if (local && status === 'aprobada') local.claimable = false;
      actions.bumpAdmin();
    }
    setBusy(null);
  }

  return (
    <AdminShell
      title="Negocios"
      subtitle={loading ? 'Cargando…' : `${businesses.length} perfiles · ${claims.length} reclamos · ${toVerify.length} por verificar`}
      action={<Button label="Dar de alta un experto" icon="person-add-outline" small onPress={() => router.push('/admin/alta')} />}>
      <AdminCard style={{ backgroundColor: '#13203F', gap: 6 }}>
        <Text style={[styles.name, { color: '#E3B04B' }]}>¿Quién da de alta a los expertos?</Text>
        <Text style={styles.rule}>• El experto solo: entra a la app, toca “Soy profesional u oficio” y crea su perfil (sale al momento, sin palomita hasta que verifiques su cédula).</Text>
        <Text style={styles.rule}>• Tú: con “Dar de alta un experto” lo registras y le mandas la liga por WhatsApp. Él toca “¿Eres tú? Reclama este perfil” y tú lo apruebas aquí.</Text>
      </AdminCard>

      <Text style={styles.h}>Reclamos de perfil</Text>
      {claims.length === 0 ? <EmptyState icon="checkmark-done-outline" title="Sin reclamos" text="Cuando un experto reclame el perfil que le diste de alta, aparece aquí." /> : null}
      {claims.map((c) => (
        <AdminCard key={c.id} style={{ gap: 8 }}>
          <Text style={styles.name}>{c.businessName}</Text>
          <Text style={styles.sub}>
            Lo reclama: {c.userName || 'Sin nombre'}
            {c.userEmail ? ` · ${c.userEmail}` : ''}
          </Text>
          {c.license ? <Text style={styles.sub}>Cédula o documento: {c.license}</Text> : null}
          {c.note ? <Text style={styles.small}>“{c.note}”</Text> : null}
          <Text style={styles.small}>Antes de aprobar, confírmalo con él por WhatsApp. Al aprobar, el perfil pasa a su cuenta con todo y reseñas.</Text>
          <View style={styles.wrap}>
            <Button label="Rechazar" small variant="ghost" disabled={busy === c.id} onPress={() => resolve(c, 'rechazada')} />
            <Button label="Aprobar: es suyo" small variant="success" icon="checkmark" disabled={busy === c.id} onPress={() => resolve(c, 'aprobada')} />
          </View>
        </AdminCard>
      ))}

      <Text style={[styles.h, { marginTop: 8 }]}>Cédulas por verificar</Text>
      {toVerify.length === 0 ? <EmptyState icon="shield-checkmark-outline" title="Todo verificado" text="Los perfiles nuevos sin palomita aparecen aquí." /> : null}
      {toVerify.map((b) => (
        <AdminCard key={b.id} style={styles.row}>
          <View style={{ flex: 1, minWidth: 220, gap: 2 }}>
            <Text style={styles.name}>{b.name}</Text>
            <Text style={styles.sub}>
              {categoryName(b.categorySlug)} · {worldOfCat(b.categorySlug) === 'oficios' ? 'Oficio' : 'Profesionista'} · {b.zone}
            </Text>
            <Text style={styles.sub}>{b.license ? `Documento: ${b.license}` : 'No ha cargado cédula ni certificado'}</Text>
            {worldOfCat(b.categorySlug) === 'profesionales' ? (
              <Pressable accessibilityRole="link" onPress={() => Linking.openURL('https://www.cedulaprofesional.sep.gob.mx/')}>
                <Text style={styles.link}>Buscar la cédula en el Registro Nacional de Profesionistas (SEP) ›</Text>
              </Pressable>
            ) : null}
          </View>
          <Button label="Ver perfil" small variant="ghost" onPress={() => router.push(`/n/${b.slug}`)} />
          <Button label="Verificar" small variant="success" icon="checkmark" disabled={busy === b.id} onPress={() => setBiz(b, { verified: true })} />
        </AdminCard>
      ))}

      {ownerless.length ? (
        <>
          <Text style={[styles.h, { marginTop: 8 }]}>Dados de alta por ti, sin reclamar</Text>
          {ownerless.map((b) => (
            <AdminCard key={b.id} style={styles.row}>
              <View style={{ flex: 1, minWidth: 220 }}>
                <Text style={styles.name}>{b.name}</Text>
                <Text style={styles.sub}>
                  {categoryName(b.categorySlug)} · {b.phone || 'sin WhatsApp'}
                </Text>
              </View>
              <Button label="Mandarle su liga" small icon="logo-whatsapp" onPress={() => openWhatsApp(claimMessage(b.name, b.slug), b.phone)} />
            </AdminCard>
          ))}
        </>
      ) : null}

      <Text style={[styles.h, { marginTop: 8 }]}>Todos los perfiles</Text>
      <View style={[styles.wrap, { alignItems: 'center' }]}>
        <TextInput value={q} onChangeText={setQ} placeholder="Buscar por nombre o categoría" placeholderTextColor={Brand.inkMuted} style={styles.input} />
        {([['todos', 'Todos'], ['profesionales', 'Profesionistas'], ['oficios', 'Oficios']] as const).map(([id, label]) => (
          <Pressable key={id} onPress={() => setMundo(id)} style={[styles.tab, mundo === id && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: mundo === id }}>
            <Text style={[styles.tabText, mundo === id && { color: Brand.white }]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <AdminCard style={{ paddingVertical: 4 }}>
        {all.map((b, i) => (
          <View key={b.id} style={[styles.listRow, i < all.length - 1 && { borderBottomWidth: 1, borderBottomColor: Brand.line }]}>
            <Pressable style={{ flex: 1, minWidth: 200 }} accessibilityRole="link" onPress={() => router.push(`/n/${b.slug}`)}>
              <Text style={styles.name}>{b.name}</Text>
              <Text style={styles.sub}>
                {categoryName(b.categorySlug)} · {b.zone}
                {!b.owner ? ' · sin dueño' : ''}
                {b.hiddenUnpaid ? ' · oculto por falta de pago' : ''}
              </Text>
            </Pressable>
            <Chip label={b.verified ? 'Verificado' : 'Sin verificar'} color={b.verified ? Brand.nopalSoft : Brand.mangoSoft} ink={b.verified ? Brand.nopalDark : '#5A3E00'} />
            {b.status === 'suspendido' ? <Chip label="Suspendido" color="#2B2B2B" ink="#FFFFFF" /> : null}
            <View style={[styles.wrap, { flexBasis: '100%' }]}>
              <Button label={b.verified ? 'Quitar palomita' : 'Verificar'} small variant="ghost" disabled={busy === b.id} onPress={() => setBiz(b, { verified: !b.verified })} />
              <Button
                label={b.status === 'suspendido' ? 'Reactivar' : 'Suspender'}
                small
                variant="ghost"
                disabled={busy === b.id}
                onPress={() => setBiz(b, { status: b.status === 'suspendido' ? 'activo' : 'suspendido' })}
              />
              <Button label="Estadísticas" small variant="ghost" onPress={() => router.push(`/mi-negocio/estadisticas?slug=${b.slug}`)} />
            </View>
          </View>
        ))}
      </AdminCard>
    </AdminShell>
  );
}

/** Suspendidos a mano en la demostración */
const SUSPENDED: Record<string, true> = {};

const styles = StyleSheet.create({
  h: { fontSize: 16, fontWeight: '800', color: Brand.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, flexWrap: 'wrap' },
  name: { fontSize: 15, fontWeight: '800', color: Brand.ink },
  sub: { fontSize: 12, color: Brand.inkSoft, marginTop: 2 },
  small: { fontSize: 12, color: Brand.inkSoft, lineHeight: 17 },
  link: { color: Brand.alberca, fontWeight: '700', fontSize: 12, marginTop: 4 },
  rule: { fontSize: 13, color: '#E3E8EF', lineHeight: 19 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { flexGrow: 1, minWidth: 220, height: 42, borderRadius: Radius.md, borderWidth: 1, borderColor: Brand.line, backgroundColor: Brand.white, paddingHorizontal: 12, fontSize: 14, color: Brand.ink },
  tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Brand.white, borderWidth: 1, borderColor: Brand.line },
  tabOn: { backgroundColor: Brand.ink, borderColor: Brand.ink },
  tabText: { fontSize: 13, fontWeight: '700', color: Brand.ink },
});
