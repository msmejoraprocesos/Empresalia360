import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BusinessCard } from '@/components/business-card';
import { PostCard } from '@/components/community-feed';
import { LookingForSwitch } from '@/components/looking-for';
import { PatternView } from '@/components/pattern-background';
import { RoundIconButton, SectionTitle } from '@/components/ui';
import { Brand, Radius, Shadow, TabBarSpace } from '@/constants/theme';
import { CATEGORIES, getBusiness, PROMOTIONS, searchProfessionals } from '@/data';
import type { Category, IconName } from '@/data/types';
import { markSource } from '@/lib/analytics';
import { greeting } from '@/lib/format';
import { useApp } from '@/store/app';

/** Problemas frecuentes: lo que la gente escribe, no el nombre técnico de la especialidad. */
const FREQUENT: { label: string; q: string; g: 'profesionales' | 'oficios' }[] = [
  { label: 'Me despidieron', q: 'despido', g: 'profesionales' },
  { label: 'Tengo una fuga', q: 'fuga', g: 'oficios' },
  { label: 'Divorcio', q: 'divorcio', g: 'profesionales' },
  { label: 'Se fue la luz', q: 'corto', g: 'oficios' },
  { label: 'Declaración anual', q: 'declaración anual', g: 'profesionales' },
  { label: 'Me quedé afuera', q: 'abrir puerta', g: 'oficios' },
  { label: 'Requerimiento del SAT', q: 'requerimiento', g: 'profesionales' },
  { label: 'Goteras', q: 'goteras', g: 'oficios' },
  { label: 'Testamento', q: 'testamento', g: 'profesionales' },
  { label: 'Minisplit', q: 'minisplit', g: 'oficios' },
];

const QUICK: { label: string; icon: IconName; href: '/mapa' | '/lealtad' | '/qr' | '/cliente/comunidad'; color: string }[] = [
  { label: 'Mapa', icon: 'map', href: '/mapa', color: Brand.alberca },
  { label: 'Preguntar', icon: 'help-buoy', href: '/cliente/comunidad', color: Brand.jacaranda },
  { label: 'Mis puntos', icon: 'gift', href: '/lealtad', color: Brand.nopal },
  { label: 'Mi QR', icon: 'qr-code', href: '/qr', color: Brand.ink },
];

const PROMO_STYLE: Record<string, { bg: string; fg: string; tag: string }> = {
  vence: { bg: Brand.mango, fg: Brand.ink, tag: 'VENCE PRONTO' },
  cumpleanos: { bg: Brand.bugambilia, fg: Brand.white, tag: 'TU CUMPLEAÑOS' },
  global: { bg: Brand.nopal, fg: Brand.white, tag: 'PARA TODOS' },
  negocio: { bg: Brand.alberca, fg: Brand.white, tag: 'PROMOCIÓN' },
};

function CategoryTile({ c }: { c: Category }) {
  const router = useRouter();
  const light = c.color === Brand.line || c.color === Brand.mango;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={c.name}
      onPress={() => {
        markSource('categoria');
        router.push(`/categoria/${c.slug}`);
      }}
      style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}>
      <View style={[styles.tileIcon, { backgroundColor: c.color }]}>
        <Ionicons name={c.icon} size={24} color={light ? Brand.ink : c.ink === Brand.mango ? Brand.mango : Brand.white} />
      </View>
      <Text style={styles.tileLabel} numberOfLines={2}>
        {c.name}
      </Text>
    </Pressable>
  );
}

export default function Inicio() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useApp();
  const [q, setQ] = useState('');

  const go = (text: string) => {
    if (!text.trim()) return;
    markSource('buscar');
    router.push({ pathname: '/cliente/explorar', params: { q: text.trim() } });
  };

  const pros = CATEGORIES.filter((c) => c.group === 'profesionales');
  const trades = CATEGORIES.filter((c) => c.group === 'oficios');
  const lf = state.lookingFor;
  const inGroup = (slug: string) => lf === 'todo' || CATEGORIES.find((c) => c.slug === slug)?.group === lf;
  const featured = getBusiness(lf === 'oficios' ? 'plomeria-hernandez' : 'despacho-contable-reyes');
  const top = searchProfessionals('', { sort: 'relevancia' })
    .filter((b) => inGroup(b.categorySlug) && b.slug !== featured?.slug)
    .slice(0, 3);
  const freq = FREQUENT.filter((f) => lf === 'todo' || f.g === lf);
  const upcoming = state.orders.find((o) => o.type === 'cita' && o.status === 'confirmada');
  const posts = state.posts.slice(0, 2);
  void state.profileVersion;

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <ScrollView contentContainerStyle={{ paddingBottom: TabBarSpace }} keyboardShouldPersistTaps="handled">
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.hello}>
                {greeting()}, {state.userName}
              </Text>
              <Text style={styles.headline}>¿Qué necesitas resolver?</Text>
            </View>
            <RoundIconButton icon="location-outline" label="Ver en el mapa" bg={Brand.chileDark} color={Brand.white} onPress={() => router.push('/mapa')} />
          </View>
          <View style={{ marginTop: 14 }}>
            <LookingForSwitch dark />
          </View>
          <View style={styles.search}>
            <Ionicons name="search" size={20} color={Brand.inkSoft} />
            <TextInput
              value={q}
              onChangeText={setQ}
              onSubmitEditing={() => go(q)}
              returnKeyType="search"
              placeholder={lf === 'oficios' ? 'Ej. fuga de agua, corto, cerradura' : lf === 'profesionales' ? 'Ej. despido, divorcio, declaración' : 'Ej. despido, fuga de agua, divorcio'}
              placeholderTextColor={Brand.inkMuted}
              style={styles.searchInput}
              accessibilityLabel="Describe tu problema o busca un profesional"
            />
            {q ? (
              <Pressable onPress={() => go(q)} accessibilityRole="button" style={styles.searchBtn}>
                <Text style={styles.searchBtnText}>Buscar</Text>
              </Pressable>
            ) : null}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 14 }}>
            {freq.map((f) => (
              <Pressable key={f.q} accessibilityRole="button" onPress={() => go(f.q)} style={styles.freq}>
                <Text style={styles.freqText}>{f.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          {upcoming ? (
            <Pressable onPress={() => router.push('/cliente/pedidos')} accessibilityRole="button" style={[styles.upcoming, Shadow]}>
              <View style={styles.upIcon}>
                <Ionicons name="calendar" size={22} color={Brand.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Tu próxima cita</Text>
                <Text style={styles.cardSub} numberOfLines={1}>
                  {upcoming.businessName} · {upcoming.detail}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Brand.inkMuted} />
            </Pressable>
          ) : null}

          <View style={styles.quick}>
            {QUICK.map((q) => (
              <Pressable key={q.label} accessibilityRole="button" onPress={() => router.push(q.href)} style={styles.quickItem}>
                <View style={[styles.quickIcon, { backgroundColor: q.color }]}>
                  <Ionicons name={q.icon} size={20} color={Brand.white} />
                </View>
                <Text style={styles.quickLabel}>{q.label}</Text>
              </Pressable>
            ))}
          </View>

          <SectionTitle title="Promociones de expertos" action="Mis cupones" onAction={() => router.push('/lealtad')} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
          {PROMOTIONS.filter((p) => !p.businessSlug || inGroup(getBusiness(p.businessSlug)?.categorySlug ?? '')).map((p) => {
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
                {p.photo ? <Image source={{ uri: p.photo }} style={styles.promoPhoto} contentFit="cover" accessibilityLabel={p.title} /> : null}
                <Text style={[styles.promoTag, { color: st.fg }]}>{st.tag}</Text>
                <Text style={[styles.promoBadge, { color: st.fg }]}>{p.badge}</Text>
                <Text style={[styles.promoTitle, { color: st.fg }]} numberOfLines={1}>
                  {p.title}
                </Text>
                <Text style={[styles.promoText, { color: st.fg }]} numberOfLines={2}>
                  {p.subtitle}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={{ paddingHorizontal: 16 }}>
          {lf !== 'oficios' ? (
          <PatternView kind="profesionales" style={styles.segment}>
            <View style={styles.segHead}>
              <Ionicons name="briefcase" size={18} color={Brand.chile} />
              <Text style={styles.segTitle}>Profesionales</Text>
              <Text style={styles.segSub}>Asesoría, trámites y salud</Text>
            </View>
            <View style={styles.grid}>
              {pros.map((c) => (
                <CategoryTile key={c.slug} c={c} />
              ))}
            </View>
          </PatternView>
          ) : null}

          {lf !== 'profesionales' ? (
          <PatternView kind="oficios" style={styles.segment}>
            <View style={styles.segHead}>
              <Ionicons name="hammer" size={18} color="#8A5A2B" />
              <Text style={[styles.segTitle, { color: '#5E3C1A' }]}>Oficios</Text>
              <Text style={styles.segSub}>Arreglos y trabajos en casa</Text>
            </View>
            <View style={styles.grid}>
              {trades.map((c) => (
                <CategoryTile key={c.slug} c={c} />
              ))}
            </View>
          </PatternView>
          ) : null}

          <SectionTitle title="Mejor calificados cerca de ti" action="Ver todos" onAction={() => router.push('/cliente/explorar')} />
          <View style={{ gap: 10 }}>
            {top.slice(0, 1).map((b) => (
              <BusinessCard key={b.slug} business={b} source="inicio" />
            ))}
            {featured ? <BusinessCard business={featured} sponsored source="inicio" /> : null}
            {top.slice(1).map((b) => (
              <BusinessCard key={b.slug} business={b} source="inicio" />
            ))}
          </View>

          <SectionTitle title="En la comunidad" action="Ver todo" onAction={() => router.push('/cliente/comunidad')} />
          <View style={{ gap: 10 }}>
            {posts.map((p) => (
              <PostCard key={p.id} post={p} compact />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: Brand.chile, paddingHorizontal: 20, paddingBottom: 22, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hello: { color: '#D6E0F0', fontSize: 13 },
  headline: { color: Brand.white, fontSize: 26, fontWeight: '800', letterSpacing: -0.4, marginTop: 2 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Brand.white, borderRadius: Radius.pill, paddingLeft: 16, paddingRight: 6, height: 54, marginTop: 16 },
  searchInput: { flex: 1, fontSize: 15, color: Brand.ink, height: '100%' },
  searchBtn: { backgroundColor: Brand.mango, borderRadius: Radius.pill, paddingHorizontal: 14, height: 42, justifyContent: 'center' },
  searchBtnText: { fontWeight: '800', color: Brand.ink },
  freq: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.pill, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  freqText: { color: Brand.white, fontSize: 13, fontWeight: '600' },
  upcoming: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Brand.white, borderRadius: Radius.lg, padding: 14, marginTop: 16 },
  upIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: Brand.nopal, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: Brand.ink },
  cardSub: { fontSize: 12, color: Brand.inkSoft, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  segment: { marginTop: 18, borderRadius: Radius.lg, paddingVertical: 14, paddingHorizontal: 6, borderWidth: 1, borderColor: Brand.line },
  segHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, marginBottom: 12, flexWrap: 'wrap' },
  segTitle: { fontSize: 18, fontWeight: '800', color: Brand.chileDark },
  segSub: { fontSize: 12, color: Brand.inkSoft },
  quick: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, backgroundColor: Brand.white, borderRadius: Radius.lg, paddingVertical: 12, ...Shadow },
  quickItem: { flex: 1, alignItems: 'center', gap: 6 },
  quickIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 12, fontWeight: '700', color: Brand.ink },
  promo: { width: 200, padding: 14, borderRadius: Radius.lg, ...Shadow },
  promoPhoto: { height: 100, marginHorizontal: -14, marginBottom: 10 },
  promoTag: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  promoBadge: { fontSize: 26, fontWeight: '800', marginTop: 4 },
  promoTitle: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  promoText: { fontSize: 12, marginTop: 2 },
  tile: { width: '33.33%', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  tileIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { fontSize: 12, fontWeight: '600', color: Brand.ink, textAlign: 'center' },
});
