import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { FeedFilters, PostCard, type FeedFilter } from '@/components/community-feed';
import { Button, Header } from '@/components/ui';
import { Brand, TabBarSpace } from '@/constants/theme';
import { myBusiness, useApp } from '@/store/app';

export default function ComunidadProfesional() {
  const router = useRouter();
  const { state } = useApp();
  const [filter, setFilter] = useState<FeedFilter>('todos');
  const [mine, setMine] = useState(false);
  const posts = state.posts.filter((p) => (filter === 'todos' || p.kind === filter) && (!mine || p.businessSlug === myBusiness.slug));

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title="Comunidad" subtitle="Anuncia tus servicios y comparte lo que sabes" back={false} color={Brand.ink} />
      <ScrollView contentContainerStyle={{ paddingBottom: TabBarSpace, paddingTop: 14, gap: 12 }}>
        <View style={{ paddingHorizontal: 16, flexDirection: 'row', gap: 10 }}>
          <Button label="Publicar" icon="add" style={{ flex: 1 }} onPress={() => router.push('/mi-negocio/publicar')} />
          <Button label={mine ? 'Ver todo' : 'Solo mías'} variant="ghost" style={{ flex: 1 }} onPress={() => setMine(!mine)} />
        </View>
        <FeedFilters value={filter} onChange={setFilter} />
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
