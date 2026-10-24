import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BusinessCard } from '@/components/business-card';
import { Button, Card, IconCircle, RoundIconButton, SectionTitle } from '@/components/ui';
import { Brand, Radius, Shadow, TabBarSpace } from '@/constants/theme';
import { BUSINESSES, getBusiness, PROMOTIONS } from '@/data';
import type { IconName } from '@/data/types';
import { markSource } from '@/lib/analytics';
import { greeting, money } from '@/lib/format';
import { useApp } from '@/store/app';

const ACTIONS: { label: string; icon: IconName; color: string; ink: string; href: Href; outline?: boolean }[] = [
  { label: 'Abogados', icon: 'briefcase-outline', color: Brand.chile, ink: Brand.white, href: '/categoria/abogados' },
  { label: 'Contadores', icon: 'calculator-outline', color: Brand.nopal, ink: Brand.white, href: '/categoria/contadores' },
  { label: 'Notarías y trámites', icon: 'document-text-outline', color: Brand.mango, ink: Brand.ink, href: '/categoria/notarias-y-tramites' },
  { label: 'Mapa', icon: 'location-outline', color: Brand.alberca, ink: Brand.white, href: '/mapa' },
  { label: 'Consultoría', icon: 'trending-up-outline', color: Brand.jacaranda, ink: Brand.white, href: '/categoria/consultoria' },
  { label: 'Mis citas', icon: 'calendar-outline', color: Brand.bugambilia, ink: Brand.white, href: '/cliente/pedidos' },
  { label: 'Cupones', icon: 'pricetag-outline', color: Brand.ink, ink: Brand.mango, href: '/lealtad' },
  { label: 'Más', icon: 'ellipsis-horizontal', color: Brand.white, ink: Brand.ink, href: '/cliente/explorar', outline: true },
];

const PROMO_STYLE: Record<string, { bg: string; fg: string; tag: string }> = {
  vence: { bg: Brand.mango, fg: Brand.ink, tag: 'VENCE HOY' },
  cumpleanos: { bg: Brand.bugambilia, fg: Brand.white, tag: 'TU CUMPLEAÑOS' },
  global: { bg: Brand.nopal, fg: Brand.white, tag: 'GLOBAL' },
  negocio: { bg: Brand.alberca, fg: Brand.white, tag: 'PARA TI' },
};

export default function Inicio() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, actions } = useApp();

  const activeOrder = state.orders.find((o) => o.type === 'pedido' && !['entregado', 'cancelado'].includes(o.status));
  const lastDelivered = state.orders.find((o) => o.type === 'pedido' && o.status === 'entregado' && o.lines?.length);
  // "Para ti": negocios de las categorías favoritas que aún no son favoritos, mejor calificados primero
  const favCats = new Set(state.favorites.map((f) => getBusiness(f)?.categorySlug));
  const forYou = BUSINESSES.filter((b) => !state.favorites.includes(b.slug))
    .sort((a, b) => Number(favCats.has(b.categorySlug)) - Number(favCats.has(a.categorySlug)) || b.rating - a.rating)
    .slice(0, 4);
  const sponsored = getBusiness('ortiz-salinas-abogados');

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <ScrollView contentContainerStyle={{ paddingBottom: TabBarSpace }}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{state.userName.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.hello}>{greeting()}</Text>
              <Text style={styles.name}>{state.userName}</Text>
            </View>
            <RoundIconButton icon="location-outline" label="Zona: Querétaro Centro" bg={Brand.chileDark} color={Brand.white} onPress={() => router.push('/mapa')} />
            <RoundIconButton icon="notifications-outline" label="Notificaciones" bg={Brand.chileDark} color={Brand.white} />
          </View>
        </View>

        <Card strong style={styles.summary}>
          <Text style={styles.summaryLabel}>Tus puntos Expertalia 360</Text>
          <Text style={styles.summaryValue}>{state.points.toLocaleString('es-MX')}</Text>
          <Text style={styles.summaryLabel}>
            {PROMOTIONS.length} cupones activos{activeOrder ? ' · 1 servicio en curso' : ''}
          </Text>
          <Button label="Mostrar mi QR" variant="dark" icon="qr-code" small style={{ marginTop: 12 }} onPress={() => router.push('/cliente/qr')} />
        </Card>

        <View style={styles.grid}>
          {ACTIONS.map((a) => (
            <Pressable key={a.label} style={styles.action} onPress={() => router.push(a.href)} accessibilityRole="button" accessibilityLabel={a.label}>
              <IconCircle icon={a.icon} color={a.color} ink={a.ink} size={58} outline={a.outline} />
              <Text style={styles.actionLabel} numberOfLines={2}>
                {a.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          {activeOrder ? (
            <Pressable onPress={() => router.push('/cliente/pedidos')} accessibilityRole="button">
              <Card style={styles.activeOrder}>
                <IconCircle icon="time-outline" color={Brand.chileSoft} ink={Brand.chileDark} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Tu servicio está en proceso</Text>
                  <Text style={styles.cardSub}>{activeOrder.businessName}</Text>
                </View>
                <Text style={styles.link}>Ver</Text>
              </Card>
            </Pressable>
          ) : null}

          <SectionTitle title="Tus promociones" action="Cartera" onAction={() => router.push('/lealtad')} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
          {PROMOTIONS.map((p) => {
            const st = PROMO_STYLE[p.kind];
            return (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                onPress={() => {
                  markSource('promocion');
                  if (p.businessSlug) router.push(`/negocio/${p.businessSlug}`);
                  else router.push('/categoria/contadores');
                }}
                style={[styles.promo, { backgroundColor: st.bg }, p.photo ? { paddingTop: 0, overflow: 'hidden' } : null]}>
                {p.photo ? <Image source={{ uri: p.photo }} style={styles.promoPhoto} contentFit="cover" accessibilityLabel={p.subtitle} /> : null}
                <Text style={[styles.promoTag, { color: st.fg }]}>{p.photo ? p.title.toUpperCase() : st.tag}</Text>
                <Text style={[styles.promoBadge, { color: st.fg }]}>{p.badge}</Text>
                <Text style={[styles.promoText, { color: st.fg }]} numberOfLines={2}>
                  {p.subtitle}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ paddingHorizontal: 16 }}>
          <SectionTitle title="Para ti" action="Ver todo" onAction={() => router.push('/cliente/explorar')} />
          <View style={{ gap: 10 }}>
            {forYou.slice(0, 1).map((b) => (
              <BusinessCard key={b.slug} business={b} source="inicio" />
            ))}
            {sponsored ? <BusinessCard business={sponsored} sponsored source="inicio" /> : null}
            {forYou.slice(1).map((b) => (
              <BusinessCard key={b.slug} business={b} source="inicio" />
            ))}
          </View>

          {lastDelivered ? (
            <>
              <SectionTitle title="Contrata de nuevo" />
              <Card style={styles.activeOrder}>
                <IconCircle icon="refresh" color={Brand.chileSoft} ink={Brand.chileDark} size={44} square />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {lastDelivered.detail}
                  </Text>
                  <Text style={styles.cardSub}>{lastDelivered.businessName}</Text>
                </View>
                <Button
                  label={money(lastDelivered.total)}
                  small
                  onPress={() => {
                    const biz = getBusiness(lastDelivered.businessSlug);
                    lastDelivered.lines?.forEach((l) => {
                      const item = biz?.items.find((i) => i.id === l.itemId || i.name === l.name);
                      if (item) actions.addToCart(lastDelivered.businessSlug, item.id, l.qty);
                    });
                    router.push(`/negocio/${lastDelivered.businessSlug}/menu`);
                  }}
                />
              </Card>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: Brand.chile, paddingHorizontal: 20, paddingBottom: 110, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: Brand.white, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Brand.chileDark, fontWeight: '800', fontSize: 16 },
  hello: { color: '#D6E0F0', fontSize: 12 },
  name: { color: Brand.white, fontSize: 19, fontWeight: '800' },
  summary: { marginHorizontal: 20, marginTop: -92, alignItems: 'center', borderRadius: 24, paddingVertical: 20 },
  summaryLabel: { color: Brand.inkSoft, fontSize: 13 },
  summaryValue: { color: Brand.ink, fontSize: 40, fontWeight: '800', marginVertical: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, marginTop: 22, rowGap: 18 },
  action: { width: '25%', alignItems: 'center', gap: 6, paddingHorizontal: 2 },
  actionLabel: { fontSize: 12, fontWeight: '600', color: Brand.ink, textAlign: 'center' },
  activeOrder: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: Brand.ink },
  cardSub: { fontSize: 12, color: Brand.inkSoft, marginTop: 2 },
  link: { fontSize: 13, fontWeight: '800', color: Brand.chileDark },
  promo: { width: 190, padding: 14, borderRadius: Radius.lg, ...Shadow },
  promoTag: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  promoPhoto: { height: 110, marginHorizontal: -14, marginBottom: 10 },
  promoBadge: { fontSize: 26, fontWeight: '800', marginTop: 4 },
  promoText: { fontSize: 13, marginTop: 2 },
});

