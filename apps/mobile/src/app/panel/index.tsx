import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, SectionTitle, ToggleRow } from '@/components/ui';
import { Brand, Radius, Shadow, ShadowStrong, TabBarSpace } from '@/constants/theme';
import type { IconName } from '@/data/types';
import { useBusinessStats } from '@/hooks/use-business-stats';
import { money } from '@/lib/format';
import { myBusiness, useApp } from '@/store/app';

export default function NegocioInicio() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, actions } = useApp();
  const today = state.sales.reduce((a, s) => a + s.amount, 0);
  const byMethod = (m: string) => state.sales.filter((s) => s.method === m).reduce((a, s) => a + s.amount, 0);
  const newOrders = state.incoming.filter((o) => o.status === 'recibido').length;
  const pendingReviews = myBusiness.reviews.filter((r) => !r.reply && !state.replies[r.id]).length;
  const newRequests = state.providerInbox.filter((p) => p.status === 'nueva').length;
  const { stats } = useBusinessStats(myBusiness, 1);

  const tiles: { label: string; sub?: string; icon: IconName; href: Href; bg: string; fg: string; badge?: number }[] = [
    { label: 'Contrataciones', icon: 'receipt-outline', href: '/panel/pedidos', bg: Brand.chile, fg: Brand.white, badge: newOrders },
    { label: 'Agenda', sub: '3 citas hoy', icon: 'calendar-outline', href: '/mi-negocio/agenda', bg: Brand.alberca, fg: Brand.white },
    { label: 'Servicios', icon: 'briefcase-outline', href: '/mi-negocio/productos', bg: Brand.white, fg: Brand.ink },
    { label: 'Promociones', icon: 'pricetag-outline', href: '/mi-negocio/promociones', bg: Brand.white, fg: Brand.ink },
    { label: 'Red de expertos', icon: 'people-outline', href: '/mi-negocio/red', bg: Brand.white, fg: Brand.ink },
    { label: 'Solicitudes', sub: 'de otros despachos', icon: 'mail-unread-outline', href: '/mi-negocio/proveedor', bg: Brand.white, fg: Brand.ink, badge: newRequests },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <ScrollView contentContainerStyle={{ paddingBottom: TabBarSpace }}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={styles.logo}>
              <Text style={{ fontWeight: '800', fontSize: 18, color: Brand.ink }}>DR</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bizName}>{myBusiness.name}</Text>
              <Text style={styles.darkMuted}>Modo profesional · ★ {myBusiness.rating.toFixed(1)}</Text>
            </View>
          </View>
          <Text style={[styles.darkMuted, { marginTop: 16 }]}>Cobrado hoy</Text>
          <Text style={styles.sales}>{money(today)}</Text>
        </View>

        <Card strong style={styles.toggles}>
          <ToggleRow
            icon="storefront-outline"
            iconBg={Brand.nopalSoft}
            iconColor={Brand.nopalDark}
            title="Disponible hoy"
            subtitle={state.biz.abierto ? 'Te ven como disponible en el mapa' : 'Apareces fuera de horario'}
            value={state.biz.abierto}
            onChange={() => actions.toggleBiz('abierto')}
          />
          <ToggleRow
            icon="receipt-outline"
            iconBg={Brand.chileSoft}
            iconColor={Brand.chileDark}
            title="Recibir contrataciones"
            subtitle={state.biz.pedidos ? 'Aceptando clientes nuevos' : 'Agenda llena: en pausa'}
            value={state.biz.pedidos}
            onChange={() => actions.toggleBiz('pedidos')}
          />
          <ToggleRow
            icon="videocam-outline"
            iconBg={Brand.albercaSoft}
            iconColor="#1757B8"
            title="Consultas en línea"
            subtitle={state.biz.domicilio ? 'Atiendes por videollamada' : 'Solo en despacho'}
            value={state.biz.domicilio}
            onChange={() => actions.toggleBiz('domicilio')}
            last
          />
        </Card>

        {stats ? (
          <Pressable
            onPress={() => router.push('/mi-negocio/estadisticas')}
            accessibilityRole="button"
            accessibilityLabel={`Estadísticas: hoy te vieron ${stats.visitors} personas`}
            style={({ pressed }) => [styles.statsCard, Shadow, pressed && { opacity: 0.9 }]}>
            <View style={styles.statsIcon}>
              <Ionicons name="stats-chart" size={22} color={Brand.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statsTitle}>
                Hoy te vieron <Text style={{ color: Brand.chile }}>{stats.visitors}</Text> {stats.visitors === 1 ? 'persona' : 'personas'}
              </Text>
              <Text style={styles.statsSub}>
                {stats.engaged} se detuvieron más de 10 s · {stats.funnel.selected} eligieron algo
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Brand.inkMuted} />
          </Pressable>
        ) : null}

        <View style={styles.grid}>
          {tiles.map((t) => (
            <Pressable
              key={t.label}
              accessibilityRole="button"
              accessibilityLabel={t.label}
              onPress={() => router.push(t.href)}
              style={({ pressed }) => [styles.tile, { backgroundColor: t.bg }, t.bg === Brand.white && Shadow, pressed && { opacity: 0.85 }]}>
              <Ionicons name={t.icon} size={28} color={t.bg === Brand.white ? Brand.chile : t.fg} />
              {t.badge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{t.badge}</Text>
                </View>
              ) : null}
              <View>
                <Text style={[styles.tileLabel, { color: t.fg }]}>{t.label}</Text>
                {t.sub ? <Text style={[styles.tileSub, { color: t.bg === Brand.white ? Brand.inkSoft : 'rgba(255,255,255,0.85)' }]}>{t.sub}</Text> : null}
              </View>
            </Pressable>
          ))}
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          <SectionTitle title="Corte de hoy" action="Ver detalle" onAction={() => router.push('/mi-negocio/corte')} />
          <Card>
            <View style={styles.stack}>
              <View style={{ flex: byMethod('efectivo') || 0.01, backgroundColor: Brand.ink }} />
              <View style={{ flex: byMethod('tarjeta') || 0.01, backgroundColor: Brand.chile }} />
              <View style={{ flex: byMethod('transferencia') || 0.01, backgroundColor: '#9DB2D6' }} />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
              <Text style={styles.legend}>■ Efectivo {money(byMethod('efectivo'))}</Text>
              <Text style={[styles.legend, { color: Brand.chileDark }]}>■ Tarjeta {money(byMethod('tarjeta'))}</Text>
              <Text style={[styles.legend, { color: '#4A6796' }]}>■ Transferencia {money(byMethod('transferencia'))}</Text>
            </View>
          </Card>

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
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: Brand.ink, paddingHorizontal: 20, paddingBottom: 46, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  logo: { width: 52, height: 52, borderRadius: 16, backgroundColor: Brand.mango, alignItems: 'center', justifyContent: 'center' },
  bizName: { color: Brand.white, fontSize: 18, fontWeight: '800' },
  darkMuted: { color: '#B7C1D3', fontSize: 12 },
  sales: { color: Brand.white, fontSize: 36, fontWeight: '800' },
  toggles: { marginHorizontal: 16, marginTop: -26, paddingVertical: 4, ...ShadowStrong },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 12, rowGap: 12 },
  statsCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 14, padding: 14, borderRadius: Radius.lg, backgroundColor: Brand.white },
  statsIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: Brand.chile, alignItems: 'center', justifyContent: 'center' },
  statsTitle: { fontSize: 16, fontWeight: '800', color: Brand.ink },
  statsSub: { fontSize: 12, color: Brand.inkSoft, marginTop: 2 },
  tile: { width: '48.5%', height: 112, borderRadius: Radius.lg, padding: 14, justifyContent: 'space-between' },
  tileLabel: { fontSize: 16, fontWeight: '800' },
  tileSub: { fontSize: 12, marginTop: 1 },
  badge: { position: 'absolute', top: 12, right: 12, minWidth: 26, height: 26, borderRadius: 13, backgroundColor: Brand.mango, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { fontSize: 13, fontWeight: '800', color: Brand.ink },
  stack: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden' },
  legend: { fontSize: 12, color: Brand.ink },
  pending: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
});
