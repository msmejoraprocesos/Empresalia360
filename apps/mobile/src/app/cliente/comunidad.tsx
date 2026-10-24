import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { FeedFilters, PostCard, type FeedFilter } from '@/components/community-feed';
import { EmptyState, Header } from '@/components/ui';
import { Brand, TabBarSpace } from '@/constants/theme';
import { useApp } from '@/store/app';

export default function Comunidad() {
  const { state } = useApp();
  const [filter, setFilter] = useState<FeedFilter>('todos');
  const posts = state.posts.filter((p) => filter === 'todos' || p.kind === filter);

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title="Comunidad" subtitle="Servicios, consejos y eventos de expertos de tu zona" back={false} />
      <ScrollView contentContainerStyle={{ paddingBottom: TabBarSpace, paddingTop: 14, gap: 12 }}>
        <FeedFilters value={filter} onChange={setFilter} />
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          <Text style={styles.note}>Solo publican profesionales y oficios verificados. Las preguntas que dejes aquí las ve toda la comunidad.</Text>
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
          {posts.length === 0 ? <EmptyState icon="megaphone-outline" title="Nada por aquí" text="Prueba con otro filtro." /> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 12, color: Brand.inkSoft, lineHeight: 17 },
});
