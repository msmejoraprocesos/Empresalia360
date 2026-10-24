import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { FeedFilters, PostCard, type FeedFilter } from '@/components/community-feed';
import { Pattern } from '@/components/pattern-background';
import { QuestionCard } from '@/components/questions';
import { Button, EmptyState, Header, Segmented } from '@/components/ui';
import { Brand, TabBarSpace } from '@/constants/theme';
import { myBusiness, useApp } from '@/store/app';

export default function ComunidadProfesional() {
  const router = useRouter();
  const { state } = useApp();
  const [tab, setTab] = useState<'muro' | 'preguntas'>('preguntas');
  const [filter, setFilter] = useState<FeedFilter>('todos');
  const [mine, setMine] = useState(false);
  const posts = state.posts.filter((p) => (filter === 'todos' || p.kind === filter) && (!mine || p.businessSlug === myBusiness.slug));
  // Preguntas de su categoría que aún no responde
  const questions = state.questions.filter((q) => q.categorySlug === myBusiness.categorySlug && !q.answers.some((a) => a.businessSlug === myBusiness.slug));

  return (
    <View style={{ flex: 1 }}>
      <Pattern kind="comunidad" />
      <Header title="Comunidad" subtitle="Responde preguntas y anuncia tus servicios" back={false} color={Brand.ink}>
        <View style={{ marginTop: 14 }}>
          <Segmented
            dark
            value={tab}
            onChange={setTab}
            options={[
              { value: 'preguntas', label: `Por responder (${questions.length})` },
              { value: 'muro', label: 'Muro' },
            ]}
          />
        </View>
      </Header>
      <ScrollView contentContainerStyle={{ paddingBottom: TabBarSpace, paddingTop: 14, gap: 12 }} keyboardShouldPersistTaps="handled">
        {tab === 'preguntas' ? (
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            <Text style={{ fontSize: 13, color: Brand.inkSoft }}>Clientes de tu zona preguntan sobre tu especialidad. Cada respuesta aparece con tu perfil y te trae visitas.</Text>
            {questions.map((q) => (
              <QuestionCard key={q.id} q={q} canAnswer />
            ))}
            {questions.length === 0 ? <EmptyState icon="checkmark-done-outline" title="Respondiste todo" text="Te avisamos cuando haya preguntas nuevas de tu especialidad." /> : null}
          </View>
        ) : (
          <>
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
          </>
        )}
      </ScrollView>
    </View>
  );
}
