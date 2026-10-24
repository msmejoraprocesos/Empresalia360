import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BusinessCard, ATTEND_EMOJI } from '@/components/business-card';
import { Emoji } from '@/components/emoji';
import { SpeakButton } from '@/components/speak-button';
import type { EmojiName } from '@/constants/emoji';
import { useVoiceSearch } from '@/lib/voice';
import { WORLD, type World } from '@/constants/world';
import { LookingForSwitch } from '@/components/looking-for';
import { PatternView } from '@/components/pattern-background';
import { EmptyState, Header, RoundIconButton } from '@/components/ui';
import { Brand, Radius, TabBarSpace } from '@/constants/theme';
import { ATTEND_LABEL, CATEGORIES, inWorld, searchProfessionals, specialtiesFor, type SearchFilters } from '@/data';
import type { Attend } from '@/data/types';
import { useApp } from '@/store/app';

function Pill({ label, on, onPress, icon, emoji }: { label: string; on: boolean; onPress: () => void; icon?: 'checkmark'; emoji?: EmojiName }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress} style={[styles.pill, on && styles.pillOn]}>
      {emoji ? <Emoji name={emoji} size={18} /> : on && icon ? <Ionicons name={icon} size={14} color={Brand.white} /> : null}
      <Text style={[styles.pillText, on && { color: Brand.white }]}>{label}</Text>
    </Pressable>
  );
}

const SORTS: { v: NonNullable<SearchFilters['sort']>; label: string }[] = [
  { v: 'relevancia', label: 'Recomendados' },
  { v: 'calificacion', label: 'Mejor calificados' },
  { v: 'resenas', label: 'Más reseñas' },
  { v: 'cercania', label: 'Más cerca' },
];

export default function Explorar() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string; especialidad?: string }>();
  const { state, actions } = useApp();
  const [q, setQ] = useState(params.q ?? '');
  const [specialty, setSpecialty] = useState<string | undefined>(params.especialidad);
  const [attend, setAttend] = useState<Attend>();
  const [verified, setVerified] = useState(false);
  const [freeConsult, setFreeConsult] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const [sort, setSort] = useState<NonNullable<SearchFilters['sort']>>('relevancia');
  void state.profileVersion;

  // Si llega una búsqueda nueva desde el inicio, reemplaza la anterior
  const [lastParam, setLastParam] = useState(params.q);
  if (params.q !== undefined && params.q !== lastParam) {
    setLastParam(params.q);
    setQ(params.q);
    setSpecialty(params.especialidad);
  }

  const lf = state.lookingFor;
  const voice = useVoiceSearch((t) => {
    setQ(t);
    setSpecialty(undefined);
  });
  const allSuggestions = specialtiesFor(q);
  const suggestions = allSuggestions.filter((s) => s.category.group === lf);
  // Lo que buscó lo resuelve el otro mundo (ej. busca "fuga" estando en Profesionistas)
  const other: World = lf === 'profesionales' ? 'oficios' : 'profesionales';
  const otherHits = allSuggestions.filter((s) => s.category.group === other);
  const autoSpecialty = !specialty && suggestions.length === 1 ? suggestions[0].specialty : undefined;
  const results = searchProfessionals(specialty ? '' : q, { specialty, attend, verified, freeConsult, sort }).filter((b) => !urgent || b.urgent24).filter((b) => inWorld(b, lf));
  const searching = Boolean(q.trim() || specialty);

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header
        color={WORLD[lf].color}
        subtitle={`${WORLD[lf].name} · ${WORLD[lf].sub}`}
        title="Buscar"
        back={false}
        right={<RoundIconButton icon="map-outline" label="Ver en el mapa" bg="rgba(0,0,0,0.16)" color={Brand.white} onPress={() => router.push('/mapa')} />}>
        <View style={styles.search}>
          <Emoji name="lupa" size={20} />
          <TextInput
            value={q}
            onChangeText={(t) => {
              setQ(t);
              setSpecialty(undefined);
            }}
            placeholder="Describe tu problema o escribe un nombre"
            placeholderTextColor={Brand.inkMuted}
            style={styles.searchInput}
            accessibilityLabel="Buscar profesionales y oficios"
          />
          {q ? (
            <Pressable
              onPress={() => {
                setQ('');
                setSpecialty(undefined);
              }}
              accessibilityLabel="Borrar búsqueda"
              hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={Brand.inkMuted} />
            </Pressable>
          ) : (
            <Pressable onPress={voice.listening ? voice.stop : voice.start} accessibilityRole="button" accessibilityLabel="Buscar hablando" style={[styles.mic, voice.listening && { backgroundColor: '#FDE2E2' }]}>
              <Emoji name="microfono" size={22} />
            </Pressable>
          )}
        </View>
      </Header>

      <ScrollView contentContainerStyle={{ paddingBottom: TabBarSpace, gap: 14, paddingTop: 14 }} keyboardShouldPersistTaps="handled">
        <View style={{ paddingHorizontal: 16 }}>
          <LookingForSwitch />
        </View>
        {otherHits.length && !suggestions.length ? (
          <Pressable accessibilityRole="button" onPress={() => actions.setLookingFor(other)} style={[styles.otherWorld, { borderColor: WORLD[other].color }]}>
            <Emoji name={WORLD[other].emoji} size={36} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.otherTitle, { color: WORLD[other].color }]}>{other === 'oficios' ? 'Esto lo resuelve alguien de oficio' : 'Esto lo resuelve un profesionista'}</Text>
              <Text style={styles.otherSub}>Toca aquí para buscar en {WORLD[other].name}</Text>
            </View>
          </Pressable>
        ) : null}

        {suggestions.length ? (
          <View style={{ gap: 8 }}>
            <Text style={[styles.label, { paddingHorizontal: 16 }]}>Especialidades que te pueden ayudar</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              {suggestions.map((s) => (
                <Pill
                  emoji={s.category.specialties.find((x) => x.name === s.specialty)?.emoji ?? s.category.emoji}
                  key={s.category.slug + s.specialty}
                  label={`${s.specialty} · ${s.category.name}`}
                  on={specialty === s.specialty}
                  icon="checkmark"
                  onPress={() => setSpecialty(specialty === s.specialty ? undefined : s.specialty)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {!searching ? (
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            <Text style={styles.label}>Explora por profesión u oficio</Text>
            <View style={styles.catWrap}>
              {CATEGORIES.filter((c) => c.group === lf).map((c) => (
                <Pressable key={c.slug} accessibilityRole="button" onPress={() => router.push(`/categoria/${c.slug}`)} style={styles.cat}>
                  <Emoji name={c.emoji} size={34} />
                  <Text style={styles.catText} numberOfLines={2}>
                    {c.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {(['despacho', 'en_linea', 'domicilio'] as Attend[]).map((a) => (
            <Pill key={a} label={ATTEND_LABEL[a]} emoji={ATTEND_EMOJI[a]} on={attend === a} onPress={() => setAttend(attend === a ? undefined : a)} />
          ))}
          <Pill label="Urgencias 24 h" emoji="sirena" on={urgent} onPress={() => setUrgent(!urgent)} />
          <Pill label="Verificados" emoji="palomita" on={verified} onPress={() => setVerified(!verified)} />
          <Pill label="Consulta gratis" emoji="billete" on={freeConsult} onPress={() => setFreeConsult(!freeConsult)} />
        </ScrollView>

        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <View style={styles.resultsHead}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.count, { flex: 1 }]}>
                {results.length} {results.length === 1 ? 'experto' : 'expertos'}
                {specialty ? ` en ${specialty}` : ''}
              </Text>
              {results.length ? (
                <SpeakButton
                  compact
                  text={`Encontré ${results.length} ${results.length === 1 ? 'experto' : 'expertos'}. ${results
                    .slice(0, 3)
                    .map((b) => `${b.name}, ${b.profession}, calificación ${b.rating.toFixed(1)}`)
                    .join('. ')}.`}
                />
              ) : null}
            </View>
            {voice.listening ? <Text style={{ color: Brand.chile, fontWeight: '700' }}>Te escucho… di qué necesitas</Text> : null}
            {voice.error ? <Text style={{ color: Brand.inkSoft }}>{voice.error}</Text> : null}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {SORTS.map((s) => (
                <Pressable key={s.v} onPress={() => setSort(s.v)} accessibilityRole="button" accessibilityState={{ selected: sort === s.v }}>
                  <Text style={[styles.sort, sort === s.v && { color: Brand.chile, fontWeight: '800' }]}>{s.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          {(['profesionales', 'oficios'] as const).filter((g) => g === lf).map((g) => {
            const part = results.filter((b) => inWorld(b, g));
            if (!part.length) return null;
            return (
              <PatternView key={g} kind={g} style={styles.segment}>
                <View style={styles.segHead}>
                  <Emoji name={g === 'profesionales' ? 'portafolio' : 'caja_herramientas'} size={22} />
                  <Text style={[styles.segTitle, g === 'oficios' && { color: '#5E3C1A' }]}>
                    {g === 'profesionales' ? 'Profesionales' : 'Oficios'} · {part.length}
                  </Text>
                </View>
                <View style={{ gap: 10 }}>
                  {part.map((b) => (
                    <BusinessCard key={b.slug} business={b} source="buscar" highlight={specialty ?? autoSpecialty} />
                  ))}
                </View>
              </PatternView>
            );
          })}
          {results.length === 0 && !otherHits.length ? (
            <EmptyState icon="search-outline" title="Sin resultados" text="Prueba con otras palabras, como “divorcio”, “fuga” o “declaración”, o quita algún filtro." />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Brand.white, borderRadius: Radius.pill, paddingHorizontal: 16, height: 50, marginTop: 14 },
  searchInput: { flex: 1, fontSize: 15, color: Brand.ink, height: '100%' },
  label: { fontSize: 13, fontWeight: '800', color: Brand.inkSoft, textTransform: 'uppercase', letterSpacing: 0.4 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.pill, borderWidth: 1, borderColor: Brand.line, backgroundColor: Brand.white },
  pillOn: { backgroundColor: Brand.chile, borderColor: Brand.chile },
  pillText: { fontSize: 13, fontWeight: '600', color: Brand.ink },
  catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cat: { width: '31%', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 4, borderRadius: Radius.md, backgroundColor: Brand.white, borderWidth: 1, borderColor: Brand.line },
  catText: { fontSize: 12, fontWeight: '700', color: Brand.ink, textAlign: 'center' },
  mic: { width: 40, height: 40, borderRadius: 20, backgroundColor: Brand.mangoSoft, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
  resultsHead: { gap: 6 },
  count: { fontSize: 18, fontWeight: '800', color: Brand.ink },
  otherWorld: { marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: Radius.lg, borderWidth: 2, backgroundColor: Brand.white },
  otherTitle: { fontSize: 15, fontWeight: '800' },
  otherSub: { fontSize: 12, color: Brand.inkSoft, marginTop: 2 },
  segment: { borderRadius: 22, padding: 10, borderWidth: 1, borderColor: Brand.line },
  segHead: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, paddingBottom: 10 },
  segTitle: { fontSize: 15, fontWeight: '800', color: Brand.chileDark },
  sort: { fontSize: 13, color: Brand.inkSoft, paddingVertical: 4, paddingRight: 10 },
});
