import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BusinessCard } from '@/components/business-card';
import { Emoji } from '@/components/emoji';
import { Pattern } from '@/components/pattern-background';
import { SpeakButton } from '@/components/speak-button';
import { EmptyState, Header } from '@/components/ui';
import { Brand } from '@/constants/theme';
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
      <Header title={cat.name} subtitle={`${searchProfessionals('', { category: cat.slug }).length} en Querétaro`} color={headerColor}>
        <View style={{ alignItems: 'center', gap: 10, marginTop: 10 }}>
          <View style={styles.hero}>
            <Emoji name={cat.emoji} size={64} />
          </View>
          <SpeakButton dark center text={`${cat.name}. Toca el dibujo de tu problema: ${cat.specialties.map((s) => s.name).join(', ')}.`} />
        </View>
      </Header>
      <ScrollView contentContainerStyle={{ paddingBottom: 40, gap: 12, paddingTop: 14 }}>
        <Text style={styles.label}>Especialidades</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          <Pressable accessibilityRole="button" onPress={() => setSpecialty(undefined)} style={[styles.pill, !specialty && styles.pillOn]}>
            <Emoji name="lupa" size={30} />
            <Text style={[styles.pillText, !specialty && { color: Brand.white }]}>Todas</Text>
          </Pressable>
          {cat.specialties.map((s) => {
            const on = specialty === s.name;
            return (
              <Pressable key={s.name} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setSpecialty(on ? undefined : s.name)} style={[styles.pill, on && styles.pillOn]}>
                <Emoji name={s.emoji ?? cat.emoji} size={30} />
                <Text style={[styles.pillText, on && { color: Brand.white }]} numberOfLines={2}>
                  {s.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {list.map((b) => (
            <BusinessCard key={b.slug} business={b} source="categoria" highlight={specialty} categorySlug={cat.slug} />
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
  hero: { width: 96, height: 96, borderRadius: 32, backgroundColor: Brand.white, alignItems: 'center', justifyContent: 'center' },
  pill: { width: 104, minHeight: 92, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 10, borderRadius: 18, borderWidth: 1, borderColor: Brand.line, backgroundColor: Brand.white },
  pillOn: { backgroundColor: Brand.chile, borderColor: Brand.chile },
  pillText: { fontSize: 12, fontWeight: '700', color: Brand.ink, textAlign: 'center' },
});
