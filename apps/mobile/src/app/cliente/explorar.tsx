import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BusinessCard } from '@/components/business-card';
import { LookingForSwitch } from '@/components/looking-for';
import { PatternView } from '@/components/pattern-background';
import { EmptyState, Header, RoundIconButton } from '@/components/ui';
import { Brand, Radius, TabBarSpace } from '@/constants/theme';
import { ATTEND_LABEL, CATEGORIES, categoryBySlug, searchProfessionals, specialtiesFor, type SearchFilters } from '@/data';
import type { Attend } from '@/data/types';
import { useApp } from '@/store/app';

function Pill({ label, on, onPress, icon }: { label: string; on: boolean; onPress: () => void; icon?: 'checkmark' }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress} style={[styles.pill, on && styles.pillOn]}>
      {on && icon ? <Ionicons name={icon} size={14} color={Brand.white} /> : null}
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
  const { state } = useApp();
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
  const suggestions = specialtiesFor(q).filter((s) => lf === 'todo' || s.category.group === lf);
  const autoSpecialty = !specialty && suggestions.length === 1 ? suggestions[0].specialty : undefined;
  const results = searchProfessionals(specialty ? '' : q, { specialty, attend, verified, freeConsult, sort }).filter((b) => !urgent || b.urgent24).filter((b) => lf === 'todo' || categoryBySlug(b.categorySlug)?.group === lf);
  const searching = Boolean(q.trim() || specialty);

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header
        title="Buscar un experto"
        back={false}
        right={<RoundIconButton icon="map-outline" label="Ver en el mapa" bg="rgba(0,0,0,0.16)" color={Brand.white} onPress={() => router.push('/mapa')} />}>
        <View style={styles.search}>
          <Ionicons name="search" size={20} color={Brand.inkSoft} />
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
          ) : null}
        </View>
      </Header>

      <ScrollView contentContainerStyle={{ paddingBottom: TabBarSpace, gap: 14, paddingTop: 14 }} keyboardShouldPersistTaps="handled">
        <View style={{ paddingHorizontal: 16 }}>
          <LookingForSwitch />
        </View>
        {suggestions.length ? (
          <View style={{ gap: 8 }}>
            <Text style={[styles.label, { paddingHorizontal: 16 }]}>Especialidades que te pueden ayudar</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              {suggestions.map((s) => (
                <Pill
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
              {CATEGORIES.filter((c) => lf === 'todo' || c.group === lf).map((c) => (
                <Pressable key={c.slug} accessibilityRole="button" onPress={() => router.push(`/categoria/${c.slug}`)} style={styles.cat}>
                  <Ionicons name={c.icon} size={16} color={Brand.chile} />
                  <Text style={styles.catText}>{c.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {(['despacho', 'en_linea', 'domicilio'] as Attend[]).map((a) => (
            <Pill key={a} label={ATTEND_LABEL[a]} on={attend === a} icon="checkmark" onPress={() => setAttend(attend === a ? undefined : a)} />
          ))}
          <Pill label="Urgencias 24 h" on={urgent} icon="checkmark" onPress={() => setUrgent(!urgent)} />
          <Pill label="Verificados" on={verified} icon="checkmark" onPress={() => setVerified(!verified)} />
          <Pill label="Primera consulta sin costo" on={freeConsult} icon="checkmark" onPress={() => setFreeConsult(!freeConsult)} />
        </ScrollView>

        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <View style={styles.resultsHead}>
            <Text style={styles.count}>
              {results.length} {results.length === 1 ? 'experto' : 'expertos'}
              {specialty ? ` en ${specialty}` : ''}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {SORTS.map((s) => (
                <Pressable key={s.v} onPress={() => setSort(s.v)} accessibilityRole="button" accessibilityState={{ selected: sort === s.v }}>
                  <Text style={[styles.sort, sort === s.v && { color: Brand.chile, fontWeight: '800' }]}>{s.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          {(['profesionales', 'oficios'] as const).filter((g) => lf === 'todo' || g === lf).map((g) => {
            const part = results.filter((b) => categoryBySlug(b.categorySlug)?.group === g);
            if (!part.length) return null;
            return (
              <PatternView key={g} kind={g} style={styles.segment}>
                <View style={styles.segHead}>
                  <Ionicons name={g === 'profesionales' ? 'briefcase' : 'hammer'} size={16} color={g === 'profesionales' ? Brand.chile : '#8A5A2B'} />
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
          {results.length === 0 ? (
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
  cat: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: Radius.md, backgroundColor: Brand.white, borderWidth: 1, borderColor: Brand.line },
  catText: { fontSize: 13, fontWeight: '700', color: Brand.ink },
  resultsHead: { gap: 6 },
  count: { fontSize: 18, fontWeight: '800', color: Brand.ink },
  segment: { borderRadius: 22, padding: 10, borderWidth: 1, borderColor: Brand.line },
  segHead: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, paddingBottom: 10 },
  segTitle: { fontSize: 15, fontWeight: '800', color: Brand.chileDark },
  sort: { fontSize: 13, color: Brand.inkSoft, paddingVertical: 4, paddingRight: 10 },
});
