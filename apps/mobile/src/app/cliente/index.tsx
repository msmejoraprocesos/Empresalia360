import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BusinessCard } from '@/components/business-card';
import { PostCard } from '@/components/community-feed';
import { Emoji } from '@/components/emoji';
import { LookingForSwitch } from '@/components/looking-for';
import { PatternView } from '@/components/pattern-background';
import { SpeakButton } from '@/components/speak-button';
import { SectionTitle } from '@/components/ui';
import { AVATARS } from '@/constants/avatars';
import type { EmojiName } from '@/constants/emoji';
import { Brand, Radius, Shadow, TabBarSpace } from '@/constants/theme';
import { WORLD } from '@/constants/world';
import { CATEGORIES, getBusiness, inWorld, PROMOTIONS, searchProfessionals } from '@/data';
import type { Category } from '@/data/types';
import { markSource } from '@/lib/analytics';
import { greeting } from '@/lib/format';
import { useVoiceSearch } from '@/lib/voice';
import { useApp } from '@/store/app';

/** Problemas frecuentes, con dibujo: lo que la gente dice, no el nombre técnico. */
const FREQUENT: { label: string; q: string; g: 'profesionales' | 'oficios'; emoji: EmojiName }[] = [
  { label: 'Me despidieron', q: 'despido', g: 'profesionales', emoji: 'portafolio' },
  { label: 'Tengo una fuga', q: 'fuga', g: 'oficios', emoji: 'gota' },
  { label: 'Divorcio', q: 'divorcio', g: 'profesionales', emoji: 'corazon_roto' },
  { label: 'No hay luz', q: 'corto', g: 'oficios', emoji: 'enchufe' },
  { label: 'Impuestos', q: 'declaración anual', g: 'profesionales', emoji: 'recibo' },
  { label: 'Me quedé afuera', q: 'abrir puerta', g: 'oficios', emoji: 'puerta' },
  { label: 'Carta del SAT', q: 'requerimiento', g: 'profesionales', emoji: 'gobierno' },
  { label: 'Goteras', q: 'goteras', g: 'oficios', emoji: 'paraguas' },
  { label: 'Testamento', q: 'testamento', g: 'profesionales', emoji: 'pergamino' },
  { label: 'Clima', q: 'minisplit', g: 'oficios', emoji: 'copo' },
];

const QUICK: { label: string; emoji: EmojiName; href: '/mapa' | '/lealtad' | '/cliente/pedidos' | '/cliente/comunidad' }[] = [
  { label: 'Mapa', emoji: 'mapa', href: '/mapa' },
  { label: 'Preguntar', emoji: 'mano_arriba', href: '/cliente/comunidad' },
  { label: 'Regalos', emoji: 'regalo', href: '/lealtad' },
  { label: 'Mis citas', emoji: 'calendario', href: '/cliente/pedidos' },
];

const PROMO_STYLE: Record<string, { bg: string; fg: string; emoji: EmojiName }> = {
  vence: { bg: Brand.mango, fg: Brand.ink, emoji: 'reloj' },
  cumpleanos: { bg: Brand.bugambilia, fg: Brand.white, emoji: 'fiesta' },
  global: { bg: Brand.nopal, fg: Brand.white, emoji: 'etiqueta' },
  negocio: { bg: Brand.alberca, fg: Brand.white, emoji: 'regalo' },
};

function CategoryTile({ c }: { c: Category }) {
  const router = useRouter();
  const soft = c.color === Brand.line ? Brand.line : `${c.color}22`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={c.name}
      onPress={() => {
        markSource('categoria');
        router.push(`/categoria/${c.slug}`);
      }}
      style={({ pressed }) => [styles.tile, pressed && { transform: [{ scale: 0.96 }] }]}>
      <View style={[styles.tileIcon, { backgroundColor: soft, borderColor: c.color === Brand.line ? Brand.line : `${c.color}55` }]}>
        <Emoji name={c.emoji} size={44} />
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
  const voice = useVoiceSearch((t) => {
    setQ(t);
    go(t);
  });

  const lf = state.lookingFor;
  const world = WORLD[lf];
  const cats = CATEGORIES.filter((c) => c.group === lf);
  const featured = getBusiness(lf === 'oficios' ? 'plomeria-hernandez' : 'despacho-contable-reyes');
  const top = searchProfessionals('', { sort: 'relevancia' })
    .filter((b) => inWorld(b, lf) && b.slug !== featured?.slug)
    .slice(0, 3);
  const freq = FREQUENT.filter((f) => f.g === lf);
  const upcoming = state.orders.find((o) => o.type === 'cita' && o.status === 'confirmada');
  const posts = state.posts.filter((p) => inWorld(getBusiness(p.businessSlug), lf)).slice(0, 2);
  void state.profileVersion;

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <ScrollView contentContainerStyle={{ paddingBottom: TabBarSpace }} keyboardShouldPersistTaps="handled">
        <View style={[styles.header, { paddingTop: insets.top + 14, backgroundColor: world.color }]}>
          <View style={styles.headerRow}>
            <Image source={AVATARS.usuario} style={styles.me} contentFit="cover" accessibilityLabel="Tu foto" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.hello, { color: world.ink }]}>
                {greeting()}, {state.userName}
              </Text>
              <Text style={styles.headline}>¿Qué necesitas?</Text>
            </View>
            <SpeakButton
              dark
              compact
              text={`${greeting()}, ${state.userName}. Estás en ${world.name}: ${world.who}. Toca un dibujo para buscar, o toca el micrófono y dilo con tu voz. Para cambiar, toca el otro botón de arriba.`}
            />
          </View>
          <View style={{ marginTop: 14 }}>
            <LookingForSwitch dark />
          </View>
          <View style={styles.search}>
            <Emoji name="lupa" size={22} />
            <TextInput
              value={q}
              onChangeText={setQ}
              onSubmitEditing={() => go(q)}
              returnKeyType="search"
              placeholder={lf === 'oficios' ? 'Fuga, luz, cerradura…' : 'Despido, divorcio, impuestos…'}
              placeholderTextColor={Brand.inkMuted}
              style={styles.searchInput}
              accessibilityLabel="Describe tu problema o busca un experto"
            />
            {q ? (
              <Pressable onPress={() => go(q)} accessibilityRole="button" style={styles.searchBtn}>
                <Text style={styles.searchBtnText}>Buscar</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={voice.listening ? voice.stop : voice.start}
                accessibilityRole="button"
                accessibilityLabel="Buscar hablando"
                style={[styles.mic, voice.listening && { backgroundColor: '#FDE2E2' }]}>
                <Emoji name="microfono" size={24} />
              </Pressable>
            )}
          </View>
          {voice.listening ? <Text style={styles.voiceHint}>Te escucho… di qué necesitas</Text> : null}
          {voice.error ? <Text style={styles.voiceHint}>{voice.error}</Text> : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingTop: 16 }}>
          {freq.map((f) => (
            <Pressable key={f.q} accessibilityRole="button" accessibilityLabel={f.label} onPress={() => go(f.q)} style={({ pressed }) => [styles.problem, Shadow, pressed && { transform: [{ scale: 0.96 }] }]}>
              <Emoji name={f.emoji} size={36} />
              <Text style={styles.problemText} numberOfLines={2}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 16 }}>
          {upcoming ? (
            <Pressable onPress={() => router.push('/cliente/pedidos')} accessibilityRole="button" style={[styles.upcoming, Shadow]}>
              <Emoji name="calendario" size={40} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Tu próxima cita</Text>
                <Text style={styles.cardSub} numberOfLines={1}>
                  {upcoming.businessName} · {upcoming.detail}
                </Text>
              </View>
              <SpeakButton compact text={`Tu próxima cita es con ${upcoming.businessName}. ${upcoming.detail}.`} />
            </Pressable>
          ) : null}

          <View style={styles.quick}>
            {QUICK.map((qk) => (
              <Pressable key={qk.label} accessibilityRole="button" onPress={() => router.push(qk.href)} style={({ pressed }) => [styles.quickItem, pressed && { opacity: 0.7 }]}>
                <View style={styles.quickIcon}>
                  <Emoji name={qk.emoji} size={30} />
                </View>
                <Text style={styles.quickLabel}>{qk.label}</Text>
              </Pressable>
            ))}
          </View>

          <PatternView kind={lf} style={styles.segment}>
            <View style={styles.segHead}>
              <Emoji name={world.emoji} size={26} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.segTitle, { color: world.dark }]}>{world.name}</Text>
                <Text style={styles.segSub}>{world.sub}</Text>
              </View>
              <SpeakButton compact text={`${world.name}: ${cats.map((c) => c.name).join(', ')}.`} />
            </View>
            <View style={styles.grid}>
              {cats.map((c) => (
                <CategoryTile key={c.slug} c={c} />
              ))}
            </View>
          </PatternView>

          <SectionTitle title="Promociones" action="Mis regalos" onAction={() => router.push('/lealtad')} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
          {PROMOTIONS.filter((p) => !p.businessSlug || inWorld(getBusiness(p.businessSlug), lf)).map((p) => {
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
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[styles.promoBadge, { color: st.fg }]}>{p.badge}</Text>
                  {p.photo ? null : <Emoji name={st.emoji} size={40} />}
                </View>
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
          <SectionTitle title={`${world.name} mejor calificados`} action="Ver todos" onAction={() => router.push('/cliente/explorar')} />
          <View style={{ gap: 12 }}>
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
  header: { backgroundColor: Brand.chile, paddingHorizontal: 18, paddingBottom: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  me: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: Brand.white, backgroundColor: Brand.white },
  hello: { color: '#D6E0F0', fontSize: 13 },
  headline: { color: Brand.white, fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Brand.white, borderRadius: Radius.pill, paddingLeft: 16, paddingRight: 6, height: 58, marginTop: 14 },
  searchInput: { flex: 1, fontSize: 16, color: Brand.ink, height: '100%' },
  searchBtn: { backgroundColor: Brand.mango, borderRadius: Radius.pill, paddingHorizontal: 16, height: 46, justifyContent: 'center' },
  searchBtnText: { fontWeight: '800', color: Brand.ink, fontSize: 15 },
  mic: { width: 46, height: 46, borderRadius: 23, backgroundColor: Brand.mangoSoft, alignItems: 'center', justifyContent: 'center' },
  voiceHint: { color: Brand.white, fontSize: 13, marginTop: 8, textAlign: 'center' },
  problem: { width: 96, height: 104, backgroundColor: Brand.white, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 8 },
  problemText: { fontSize: 12, fontWeight: '800', color: Brand.ink, textAlign: 'center' },
  upcoming: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Brand.white, borderRadius: Radius.lg, padding: 14, marginTop: 16 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: Brand.ink },
  cardSub: { fontSize: 12, color: Brand.inkSoft, marginTop: 2 },
  quick: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, backgroundColor: Brand.white, borderRadius: Radius.lg, paddingVertical: 12, ...Shadow },
  quickItem: { flex: 1, alignItems: 'center', gap: 6 },
  quickIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.tortilla },
  quickLabel: { fontSize: 13, fontWeight: '800', color: Brand.ink },
  segment: { marginTop: 18, borderRadius: Radius.lg, paddingVertical: 14, paddingHorizontal: 6, borderWidth: 1, borderColor: Brand.line },
  segHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, marginBottom: 12 },
  segTitle: { fontSize: 20, fontWeight: '800', color: Brand.chileDark },
  segSub: { fontSize: 12, color: Brand.inkSoft },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  tile: { width: '33.33%', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  tileIcon: { width: 78, height: 78, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 2, backgroundColor: Brand.white },
  tileLabel: { fontSize: 13, fontWeight: '700', color: Brand.ink, textAlign: 'center' },
  promo: { width: 210, padding: 14, borderRadius: Radius.lg, gap: 2, ...Shadow },
  promoPhoto: { height: 100, marginHorizontal: -14, marginBottom: 10 },
  promoBadge: { fontSize: 30, fontWeight: '800' },
  promoTitle: { fontSize: 15, fontWeight: '800', marginTop: 4 },
  promoText: { fontSize: 12 },
});
