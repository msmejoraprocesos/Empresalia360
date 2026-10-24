import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { BusinessCard } from '@/components/business-card';
import { EmptyState, Header, OptionPill } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { businessesInCategory, categoryBySlug, distanceTo } from '@/data';

type Filter = 'todos' | 'abierto' | 'promo' | 'cerca';

export default function Categoria() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const cat = categoryBySlug(slug);
  const [filter, setFilter] = useState<Filter>('todos');
  let list = businessesInCategory(slug);
  if (filter === 'abierto') list = list.filter((b) => b.isOpen);
  if (filter === 'promo') list = list.filter((b) => b.promo);
  if (filter === 'cerca') list = [...list].sort((a, b) => distanceTo(a) - distanceTo(b));
  else list = [...list].sort((a, b) => b.rating - a.rating);

  const headerColor = cat && cat.color !== Brand.line && cat.color !== Brand.mango ? cat.color : Brand.chile;

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title={cat?.name ?? 'Categoría'} subtitle={`${list.length} en tu zona`} color={headerColor} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ padding: 16, gap: 8 }}>
        <OptionPill label="Todos" selected={filter === 'todos'} onPress={() => setFilter('todos')} />
        <OptionPill label="Abierto ahora" selected={filter === 'abierto'} onPress={() => setFilter('abierto')} />
        <OptionPill label="Con promoción" selected={filter === 'promo'} onPress={() => setFilter('promo')} />
        <OptionPill label="Más cerca" selected={filter === 'cerca'} onPress={() => setFilter('cerca')} />
      </ScrollView>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 10 }}>
        {list.map((b) => (
          <BusinessCard key={b.slug} business={b} source="categoria" />
        ))}
        {list.length === 0 ? <EmptyState icon="storefront-outline" title="Nada por aquí" text="Prueba con otro filtro." /> : null}
      </ScrollView>
    </View>
  );
}
