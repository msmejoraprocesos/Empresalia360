import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomBar, Button, Card, Chip, EmptyState, Field, Header, StarInput } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { useLoginGate } from '@/lib/auth';
import { useApp } from '@/store/app';

const TAGS = ['Atención', 'Claridad', 'Precio', 'Resultado', 'Puntualidad'];

export default function Calificar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, actions } = useApp();
  const gate = useLoginGate();
  const order = state.orders.find((o) => o.id === id);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  if (!order) return <EmptyState icon="receipt-outline" title="Pedido no encontrado" text="" />;

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title="Calificar" subtitle={order.businessName} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        <Card style={{ alignItems: 'center', gap: 12 }}>
          <Text style={styles.title}>¿Cómo te fue con {order.businessName}?</Text>
          <Text style={styles.sub}>{order.detail}</Text>
          <StarInput value={rating} onChange={setRating} />
        </Card>
        <Text style={styles.label}>¿Qué destacas?</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TAGS.map((t) => {
            const on = tags.includes(t);
            return (
              <Text
                key={t}
                onPress={() => setTags(on ? tags.filter((x) => x !== t) : [...tags, t])}
                accessibilityRole="button"
                style={[styles.tag, on && styles.tagOn]}>
                {t}
              </Text>
            );
          })}
        </View>
        <Field label="Cuéntanos más (opcional)" value={body} onChangeText={setBody} multiline />
        <Chip label="Tu reseña aparecerá como visita verificada" color={Brand.nopalSoft} ink={Brand.nopalDark} icon="checkmark" />
      </ScrollView>
      <BottomBar>
        <Button
          label="Publicar y ganar 50 puntos"
          onPress={() => gate(() => {
            const text = [tags.join(', '), body.trim()].filter(Boolean).join('. ') || 'Buena experiencia.';
            actions.addReview(order.businessSlug, rating, text, order.id);
            router.back();
          })}
        />
      </BottomBar>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800', color: Brand.ink, textAlign: 'center' },
  sub: { fontSize: 13, color: Brand.inkSoft },
  label: { fontSize: 14, fontWeight: '800', color: Brand.ink },
  tag: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: Brand.white, borderWidth: 1, borderColor: Brand.line, color: Brand.ink, overflow: 'hidden', fontWeight: '600' },
  tagOn: { backgroundColor: Brand.chileSoft, borderColor: Brand.chile, color: Brand.chileDark },
});
