import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BusinessCard } from '@/components/business-card';
import { Pattern } from '@/components/pattern-background';
import { EmptyState, Header } from '@/components/ui';
import { Brand, Radius } from '@/constants/theme';
import { categoryBySlug, searchProfessionals } from '@/data';
import { useApp } from '@/store/app';

export default function Categoria() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { state } = useApp();
  const [specialty, setSpecialty] = useState<string>();
  const cat = categoryBySlug(slug);
  void state.profileVersion;
  if (!cat) return <EmptyState icon="grid-outline" title="Categoría no encontrada" text="" />;

  const list = searchProfessionals('', { category: cat.slug, specialty });
  const headerColor = cat.color === Brand.line || cat.color === Brand.mango ? Brand.chile : cat.color;

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Pattern kind={cat.group} />
      <Header title={cat.name} subtitle={`${searchProfessionals('', { category: cat.slug }).length} en Querétaro`} color={headerColor} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40, gap: 12, paddingTop: 14 }}>
        <Text style={styles.label}>Especialidades</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          <Pressable accessibilityRole="button" onPress={() => setSpecialty(undefined)} style={[styles.pill, !specialty && styles.pillOn]}>
            <Text style={[styles.pillText, !specialty && { color: Brand.white }]}>Todas</Text>
          </Pressable>
          {cat.specialties.map((s) => {
            const on = specialty === s.name;
            return (
              <Pressable key={s.name} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setSpecialty(on ? undefined : s.name)} style={[styles.pill, on && styles.pillOn]}>
                <Text style={[styles.pillText, on && { color: Brand.white }]}>{s.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {list.map((b) => (
            <BusinessCard key={b.slug} business={b} source="categoria" highlight={specialty} />
          ))}
          {list.length === 0 ? (
            <EmptyState icon="people-outline" title="Aún no hay expertos aquí" text="Pronto se sumarán más. Mientras, prueba con otra especialidad." />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '800', color: Brand.inkSoft, textTransform: 'uppercase', letterSpacing: 0.4, paddingHorizontal: 16 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, borderWidth: 1, borderColor: Brand.line, backgroundColor: Brand.white },
  pillOn: { backgroundColor: Brand.chile, borderColor: Brand.chile },
  pillText: { fontSize: 13, fontWeight: '700', color: Brand.ink },
});
