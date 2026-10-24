import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProAvatar } from '@/components/business-card';
import { Pattern } from '@/components/pattern-background';
import { Button, Card, Chip, SectionTitle, ToggleRow } from '@/components/ui';
import { Brand, Radius, Shadow, ShadowStrong, TabBarSpace } from '@/constants/theme';
import { ATTEND_LABEL, categoryBySlug, profileCompleteness } from '@/data';
import type { IconName } from '@/data/types';
import { useBusinessStats } from '@/hooks/use-business-stats';
import { money } from '@/lib/format';
import { myBusiness, useApp } from '@/store/app';

export default function ProfesionalInicio() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, actions } = useApp();
  const { stats } = useBusinessStats(myBusiness, 1);
  const { percent, missing } = profileCompleteness(myBusiness);
  const fresh = state.requests.filter((r) => r.status === 'nueva');
  const pendingReviews = myBusiness.reviews.filter((r) => !r.reply && !state.replies[r.id]).length;
  const myPosts = state.posts.filter((p) => p.businessSlug === myBusiness.slug);
  const today = new Date().toDateString();
  const income = state.sales.filter((s) => new Date(s.createdAt).toDateString() === today).reduce((a, s) => a + s.amount, 0);
  void state.profileVersion;

  const tiles: { label: string; sub: string; icon: IconName; href: Href; badge?: number }[] = [
    { label: 'Mi perfil', sub: `${percent}% completo`, icon: 'person-circle-outline', href: '/mi-negocio/perfil' },
    { label: 'Agenda', sub: 'Citas de la semana', icon: 'calendar-outline', href: '/mi-negocio/agenda' },
    { label: 'Servicios', sub: `${state.myItems.length} publicados`, icon: 'briefcase-outline', href: '/mi-negocio/productos' },
    { label: 'Publicar', sub: `${myPosts.length} en la comunidad`, icon: 'megaphone-outline', href: '/mi-negocio/publicar' },
    { label: 'Cobrar', sub: 'Anotar o pedir un pago', icon: 'cash-outline', href: '/panel/cobrar' },
    { label: 'Mi QR', sub: 'Para tarjetas y reseñas', icon: 'qr-code-outline', href: '/qr' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Pattern kind={categoryBySlug(myBusiness.categorySlug)?.group ?? 'profesionales'} />
      <ScrollView contentContainerStyle={{ paddingBottom: TabBarSpace }}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <ProAvatar business={myBusiness} size={56} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.bizName} numberOfLines={1}>
                {myBusiness.name}
              </Text>
              <Text style={styles.darkMuted}>
                {myBusiness.profession} · ★ {myBusiness.rating.toFixed(1)} ({myBusiness.ratingCount})
              </Text>
            </View>
          </View>
          <View style={styles.headStats}>
            <View style={{ flex: 1 }}>
              <Text style={styles.darkMuted}>Te vieron hoy</Text>
              <Text style={styles.big}>{stats?.visitors ?? '—'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.darkMuted}>Solicitudes nuevas</Text>
              <Text style={styles.big}>{fresh.length}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.darkMuted}>Cobrado hoy</Text>
              <Text style={styles.big}>{money(income)}</Text>
            </View>
          </View>
        </View>

        <Pressable onPress={() => router.push('/mi-negocio/perfil')} accessibilityRole="button" style={[styles.profileCard, ShadowStrong]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.cardTitle}>Tu perfil está al {percent}%</Text>
            <Text style={styles.link}>Editar</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${percent}%` }]} />
          </View>
          <Text style={styles.cardSub}>
            {missing.length ? `Te falta: ${missing.slice(0, 2).join(' y ').toLowerCase()}. Los perfiles completos reciben hasta 3 veces más solicitudes.` : 'Perfil completo. Así te ven tus clientes cuando buscan tus especialidades.'}
          </Text>
          <View style={styles.chips}>
            {myBusiness.specialties.map((s) => (
              <Chip key={s} label={s} color={Brand.chileSoft} ink={Brand.chileDark} />
            ))}
          </View>
          <Button label="Ver mi perfil público" variant="ghost" icon="eye-outline" small onPress={() => router.push(`/negocio/${myBusiness.slug}`)} />
        </Pressable>

        <View style={styles.grid}>
          {tiles.map((t) => (
            <Pressable key={t.label} accessibilityRole="button" accessibilityLabel={t.label} onPress={() => router.push(t.href)} style={({ pressed }) => [styles.tile, Shadow, pressed && { opacity: 0.85 }]}>
              <Ionicons name={t.icon} size={26} color={Brand.chile} />
              <View>
                <Text style={styles.tileLabel}>{t.label}</Text>
                <Text style={styles.tileSub}>{t.sub}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          <SectionTitle title="Solicitudes nuevas" action="Ver todas" onAction={() => router.push('/panel/pedidos')} />
          <View style={{ gap: 10 }}>
            {fresh.slice(0, 2).map((r) => (
              <Pressable key={r.id} onPress={() => router.push('/panel/pedidos')} accessibilityRole="button">
                <Card style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.cardTitle}>{r.customer}</Text>
                    <Chip label={r.type === 'cita' ? 'Cita' : 'Cotización'} color={r.type === 'cita' ? Brand.albercaSoft : Brand.jacarandaSoft} ink={r.type === 'cita' ? '#1757B8' : Brand.jacaranda} />
                  </View>
                  <Text style={styles.cardSub}>{r.detail}</Text>
                  <Text style={[styles.cardSub, { fontWeight: '700' }]}>
                    {r.specialty} · {ATTEND_LABEL[r.attend]} · {r.when}
                  </Text>
                </Card>
              </Pressable>
            ))}
            {fresh.length === 0 ? <Text style={styles.cardSub}>No tienes solicitudes pendientes.</Text> : null}
          </View>

          {pendingReviews ? (
            <Pressable onPress={() => router.push('/panel/resenas')} accessibilityRole="button">
              <Card style={styles.pending}>
                <Ionicons name="star" size={22} color="#C98A0B" />
                <Text style={{ flex: 1, fontWeight: '700', color: Brand.ink }}>
                  {pendingReviews} {pendingReviews === 1 ? 'reseña' : 'reseñas'} por responder
                </Text>
                <Ionicons name="chevron-forward" size={20} color={Brand.inkMuted} />
              </Card>
            </Pressable>
          ) : null}

          <SectionTitle title="Disponibilidad" />
          <Card style={{ paddingVertical: 4 }}>
            <ToggleRow
              icon="checkmark-circle-outline"
              iconBg={Brand.nopalSoft}
              iconColor={Brand.nopalDark}
              title="Disponible hoy"
              subtitle={state.biz.disponible ? 'Apareces disponible en búsquedas y mapa' : 'Apareces fuera de horario'}
              value={state.biz.disponible}
              onChange={() => actions.toggleBiz('disponible')}
            />
            <ToggleRow
              icon="person-add-outline"
              iconBg={Brand.chileSoft}
              iconColor={Brand.chileDark}
              title="Aceptar clientes nuevos"
              subtitle={state.biz.nuevosClientes ? 'Te pueden agendar y pedir cotización' : 'Agenda llena: solo clientes actuales'}
              value={state.biz.nuevosClientes}
              onChange={() => actions.toggleBiz('nuevosClientes')}
            />
            <ToggleRow
              icon="videocam-outline"
              iconBg={Brand.albercaSoft}
              iconColor="#1757B8"
              title="Consultas en línea"
              subtitle={state.biz.enLinea ? 'Atiendes por videollamada' : 'Solo presencial'}
              value={state.biz.enLinea}
              onChange={() => actions.toggleBiz('enLinea')}
              last
            />
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: Brand.ink, paddingHorizontal: 20, paddingBottom: 54, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  bizName: { color: Brand.white, fontSize: 19, fontWeight: '800' },
  darkMuted: { color: '#B7C1D3', fontSize: 12 },
  headStats: { flexDirection: 'row', gap: 10, marginTop: 18 },
  big: { color: Brand.white, fontSize: 22, fontWeight: '800', marginTop: 2 },
  profileCard: { marginHorizontal: 16, marginTop: -34, backgroundColor: Brand.white, borderRadius: Radius.lg, padding: 16, gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: Brand.ink },
  cardSub: { fontSize: 13, color: Brand.inkSoft, lineHeight: 18 },
  link: { fontSize: 13, fontWeight: '800', color: Brand.chile },
  track: { height: 8, borderRadius: 4, backgroundColor: Brand.line, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: Brand.nopal },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 14, rowGap: 12 },
  tile: { width: '48.5%', height: 104, borderRadius: Radius.lg, padding: 14, justifyContent: 'space-between', backgroundColor: Brand.white },
  tileLabel: { fontSize: 15, fontWeight: '800', color: Brand.ink },
  tileSub: { fontSize: 12, color: Brand.inkSoft, marginTop: 1 },
  pending: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
});
