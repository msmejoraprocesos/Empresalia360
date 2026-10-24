import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BusinessCard } from '@/components/business-card';
import { EmptyState, Header, IconCircle, RoundIconButton } from '@/components/ui';
import { Brand, Radius, Shadow, TabBarSpace } from '@/constants/theme';
import { CATEGORIES, countInCategory, searchBusinesses } from '@/data';

export default function Explorar() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const results = searchBusinesses(q);

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header
        title="Explorar"
        back={false}
        right={<RoundIconButton icon="map-outline" label="Ver en el mapa" bg="rgba(0,0,0,0.16)" color={Brand.white} onPress={() => router.push('/mapa')} />}>
        <View style={styles.search}>
          <Ionicons name="search" size={20} color={Brand.inkSoft} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="¿Qué necesitas hoy?"
            placeholderTextColor={Brand.inkMuted}
            style={styles.searchInput}
            accessibilityLabel="Buscar negocios, productos o servicios"
            returnKeyType="search"
          />
          {q ? (
            <Pressable onPress={() => setQ('')} accessibilityLabel="Borrar búsqueda" hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={Brand.inkMuted} />
            </Pressable>
          ) : null}
        </View>
      </Header>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: TabBarSpace }} keyboardShouldPersistTaps="handled">
        {q ? (
          results.length ? (
            <View style={{ gap: 10 }}>
              <Text style={styles.count}>
                {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
              </Text>
              {results.map((b) => (
                <BusinessCard key={b.slug} business={b} source="buscar" />
              ))}
            </View>
          ) : (
            <EmptyState icon="search-outline" title="Sin resultados" text="Prueba con otra palabra, como “divorcio”, “declaración” o “notaría”." />
          )
        ) : (
          <View style={styles.grid}>
            {CATEGORIES.map((c) => (
              <Pressable
                key={c.slug}
                accessibilityRole="button"
                accessibilityLabel={c.name}
                onPress={() => router.push(`/categoria/${c.slug}`)}
                style={({ pressed }) => [styles.tile, Shadow, pressed && { opacity: 0.85 }]}>
                <IconCircle icon={c.icon} color={c.color} ink={c.ink} size={52} square />
                <View>
                  <Text style={styles.tileName}>{c.name}</Text>
                  <Text style={styles.tileCount}>
                    {countInCategory(c.slug)} {countInCategory(c.slug) === 1 ? 'negocio' : 'negocios'}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    paddingHorizontal: 18,
    borderRadius: Radius.pill,
    backgroundColor: Brand.white,
  },
  searchInput: { flex: 1, fontSize: 15, color: Brand.ink, height: '100%' },
  count: { fontSize: 13, color: Brand.inkSoft },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  tile: { width: '48.5%', height: 128, padding: 14, borderRadius: Radius.lg, backgroundColor: Brand.white, justifyContent: 'space-between' },
  tileName: { fontSize: 16, fontWeight: '800', color: Brand.ink },
  tileCount: { fontSize: 12, color: Brand.inkSoft, marginTop: 2 },
});
