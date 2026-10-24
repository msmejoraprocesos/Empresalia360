import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { FeedFilters, PostCard, type FeedFilter } from '@/components/community-feed';
import { Pattern } from '@/components/pattern-background';
import { LookingForSwitch } from '@/components/looking-for';
import { AskForm, QuestionCard } from '@/components/questions';
import { WORLD } from '@/constants/world';
import { categoryBySlug, getBusiness } from '@/data';
import { Card, EmptyState, Header, Segmented } from '@/components/ui';
import { Brand, Radius, TabBarSpace } from '@/constants/theme';
import { useApp } from '@/store/app';

const LEVELS = [
  { name: 'Nuevo', min: 0 },
  { name: 'Cliente', min: 300 },
  { name: 'Cliente frecuente', min: 1000 },
  { name: 'Embajador', min: 2000 },
];

export default function Comunidad() {
  const { state } = useApp();
  const [tab, setTab] = useState<'muro' | 'preguntas'>('muro');
  const [filter, setFilter] = useState<FeedFilter>('todos');
  const lf = state.lookingFor;
  const inWorld = (catSlug?: string) => categoryBySlug(catSlug ?? '')?.group === lf;
  const posts = state.posts.filter((p) => (filter === 'todos' || p.kind === filter) && inWorld(getBusiness(p.businessSlug)?.categorySlug));
  const questions = state.questions.filter((q) => inWorld(q.categorySlug));
  const level = [...LEVELS].reverse().find((l) => state.points >= l.min) ?? LEVELS[0];
  const next = LEVELS[LEVELS.indexOf(level) + 1];
  const progress = next ? (state.points - level.min) / (next.min - level.min) : 1;

  return (
    <View style={{ flex: 1 }}>
      <Pattern kind={lf} />
      <Header title="Comunidad" subtitle={`${WORLD[lf].name} · servicios, consejos y preguntas`} back={false} color={WORLD[lf].color}>
        <View style={{ marginTop: 12 }}>
          <LookingForSwitch dark />
        </View>
        <View style={{ marginTop: 10 }}>
          <Segmented
            dark
            value={tab}
            onChange={setTab}
            options={[
              { value: 'muro', label: 'Muro' },
              { value: 'preguntas', label: `Preguntas (${questions.length})` },
            ]}
          />
        </View>
      </Header>
      <ScrollView contentContainerStyle={{ paddingBottom: TabBarSpace, paddingTop: 14, gap: 12 }} keyboardShouldPersistTaps="handled">
        <View style={{ paddingHorizontal: 16 }}>
          <Card style={styles.level}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text style={styles.levelName}>{level.name}</Text>
              <Text style={styles.levelPts}>{state.points.toLocaleString('es-MX')} puntos</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
            <Text style={styles.levelSub}>
              {next ? `${next.min - state.points} puntos para ser ${next.name}. Sumas al agendar, reseñar y recomendar.` : 'Eres Embajador de Expertalia 360.'}
            </Text>
          </Card>
        </View>

        {tab === 'muro' ? (
          <>
            <FeedFilters value={filter} onChange={setFilter} />
            <View style={{ paddingHorizontal: 16, gap: 12 }}>
              {posts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
              {posts.length === 0 ? <EmptyState icon="megaphone-outline" title="Nada por aquí" text="Prueba con otro filtro." /> : null}
            </View>
          </>
        ) : (
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            <AskForm />
            {questions.map((q) => (
              <QuestionCard key={q.id} q={q} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  level: { gap: 8, backgroundColor: Brand.ink },
  levelName: { fontSize: 18, fontWeight: '800', color: Brand.white },
  levelPts: { fontSize: 13, fontWeight: '700', color: Brand.mango },
  track: { height: 8, borderRadius: Radius.pill, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  fill: { height: 8, borderRadius: Radius.pill, backgroundColor: Brand.mango },
  levelSub: { fontSize: 12, color: '#B7C1D3' },
});
