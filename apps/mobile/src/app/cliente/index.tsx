import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BusinessCard } from '@/components/business-card';
import { PostCard } from '@/components/community-feed';
import { RoundIconButton, SectionTitle } from '@/components/ui';
import { Brand, Radius, Shadow, TabBarSpace } from '@/constants/theme';
import { CATEGORIES, getBusiness, searchProfessionals } from '@/data';
import type { Category } from '@/data/types';
import { markSource } from '@/lib/analytics';
import { greeting } from '@/lib/format';
import { useApp } from '@/store/app';

/** Problemas frecuentes: lo que la gente escribe, no el nombre técnico de la especialidad. */
const FREQUENT = [
  { label: 'Me despidieron', q: 'despido' },
  { label: 'Divorcio', q: 'divorcio' },
  { label: 'Declaración anual', q: 'declaración anual' },
  { label: 'Tengo una fuga', q: 'fuga' },
  { label: 'Requerimiento del SAT', q: 'requerimiento' },
  { label: 'Se fue la luz', q: 'corto' },
  { label: 'Testamento', q: 'testamento' },
  { label: 'Terapia', q: 'terapia' },
];

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
  const top = searchProfessionals('', { sort: 'relevancia' }).slice(0, 4);
  const featured = getBusiness('despacho-contable-reyes');
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
          <View style={styles.search}>
            <Ionicons name="search" size={20} color={Brand.inkSoft} />
            <TextInput
              value={q}
              onChangeText={setQ}
              onSubmitEditing={() => go(q)}
              returnKeyType="search"
              placeholder="Ej. despido, fuga de agua, divorcio"
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
            {FREQUENT.map((f) => (
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

          <SectionTitle title="Profesionales" />
          <View style={styles.grid}>
            {pros.map((c) => (
              <CategoryTile key={c.slug} c={c} />
            ))}
          </View>

          <SectionTitle title="Oficios" />
          <View style={styles.grid}>
            {trades.map((c) => (
              <CategoryTile key={c.slug} c={c} />
            ))}
          </View>

          <SectionTitle title="Mejor calificados cerca de ti" action="Ver todos" onAction={() => router.push('/cliente/explorar')} />
          <View style={{ gap: 10 }}>
            {top.slice(0, 1).map((b) => (
              <BusinessCard key={b.slug} business={b} source="inicio" />
            ))}
            {featured ? <BusinessCard business={featured} sponsored source="inicio" /> : null}
            {top
              .filter((b) => b.slug !== featured?.slug)
              .slice(1, 3)
              .map((b) => (
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
  tile: { width: '33.33%', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  tileIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { fontSize: 12, fontWeight: '600', color: Brand.ink, textAlign: 'center' },
});
