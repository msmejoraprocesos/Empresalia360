import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, EmptyState, Field, Header, StarInput, Stars } from '@/components/ui';
import { Brand, Radius } from '@/constants/theme';
import { getBusiness } from '@/data';
import { useBusinessScreen } from '@/lib/analytics';
import { useLoginGate } from '@/lib/auth';
import { useApp } from '@/store/app';

const PAID: Record<string, string> = { efectivo: 'efectivo', tarjeta: 'tarjeta', transferencia: 'transferencia', liga: 'pago en línea' };

export default function Resenas() {
  const { slug, escribir } = useLocalSearchParams<{ slug: string; escribir?: string }>();
  const { state, actions } = useApp();
  const gate = useLoginGate();
  const b = getBusiness(slug);
  // Llegando desde el QR o la liga para calificar, se abre directo el formulario
  const [writing, setWriting] = useState(Boolean(escribir));
  const [thanks, setThanks] = useState(false);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  useBusinessScreen(b, 'resenas', 'vista_resenas');
  if (!b) return <EmptyState icon="storefront-outline" title="Negocio no encontrado" text="" />;

  const reviews = [...(state.userReviews[b.slug] ?? []), ...b.reviews];
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews.filter((r) => r.rating === n).length }));
  const max = Math.max(1, ...dist.map((d) => d.c));
  const recommend = reviews.length ? Math.round((reviews.filter((r) => r.rating >= 4).length / reviews.length) * 100) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title="Reseñas" subtitle={b.name} />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
            <Card style={styles.summary}>
              <View style={{ alignItems: 'center', minWidth: 90 }}>
                <Text style={styles.score}>{b.rating.toFixed(1)}</Text>
                <Stars rating={b.rating} />
                <Text style={styles.small}>{b.ratingCount} reseñas</Text>
              </View>
              <View style={{ flex: 1, gap: 5 }}>
                {dist.map((d) => (
                  <View key={d.n} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.small}>{d.n}</Text>
                    <View style={styles.barBg}>
                      <View style={[styles.bar, { width: `${(d.c / max) * 100}%` }]} />
                    </View>
                  </View>
                ))}
              </View>
            </Card>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Card style={{ flex: 1, backgroundColor: Brand.nopalSoft }}>
                <Text style={[styles.statBig, { color: Brand.nopalDark }]}>{recommend}%</Text>
                <Text style={styles.small}>lo recomiendan</Text>
              </Card>
              <Card style={{ flex: 1 }}>
                <Text style={styles.statBig}>{reviews.filter((r) => r.verified).length}</Text>
                <Text style={styles.small}>con visita verificada</Text>
              </Card>
            </View>

            {writing ? (
              <Card style={{ gap: 12 }}>
                <Text style={styles.name}>¿Cómo te fue?</Text>
                <StarInput value={rating} onChange={setRating} />
                <Field label="Tu reseña" value={body} onChangeText={setBody} multiline placeholder="Cuenta qué te gustó o qué mejorarías" />
                <Button
                  label="Publicar (+50 puntos)"
                  disabled={body.trim().length < 3}
                  onPress={() => gate(() => {
                    actions.addReview(b.slug, rating, body.trim());
                    setWriting(false);
                    setBody('');
                    setThanks(true);
                  })}
                />
              </Card>
            ) : thanks ? (
              <Card style={{ backgroundColor: Brand.nopalSoft }}>
                <Text style={[styles.name, { color: Brand.nopalDark }]}>¡Gracias! Tu reseña ya se publicó y ganaste 50 puntos.</Text>
              </Card>
            ) : (
              <Button label="Escribir reseña" icon="create-outline" onPress={() => setWriting(true)} />
            )}

            {reviews.map((r) => (
              <Card key={r.id}>
                <View style={styles.reviewHead}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.name}>{r.author}</Text>
                    <Stars rating={r.rating} size={12} />
                  </View>
                  <Text style={styles.small}>{r.dateLabel}</Text>
                </View>
                {r.verified ? (
                  <View style={{ marginTop: 6 }}>
                    <Chip label={`Visita verificada${r.paidWith ? ` · ${PAID[r.paidWith]}` : ''}`} color={Brand.nopalSoft} ink={Brand.nopalDark} icon="checkmark" />
                  </View>
                ) : null}
                <Text style={styles.body}>{r.body}</Text>
                {r.reply || state.replies[r.id] ? (
                  <View style={styles.reply}>
                    <Text style={styles.small}>
                      <Text style={{ fontWeight: '800', color: Brand.ink }}>Respuesta del negocio: </Text>
                      {state.replies[r.id] ?? r.reply}
                    </Text>
                  </View>
                ) : null}
              </Card>
            ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  score: { fontSize: 44, fontWeight: '800', color: Brand.ink, lineHeight: 48 },
  small: { fontSize: 12, color: Brand.inkSoft, marginTop: 2 },
  barBg: { flex: 1, height: 8, borderRadius: 4, backgroundColor: Brand.line },
  bar: { height: 8, borderRadius: 4, backgroundColor: '#C98A0B' },
  statBig: { fontSize: 22, fontWeight: '800', color: Brand.ink },
  reviewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '800', color: Brand.ink },
  body: { fontSize: 14, color: Brand.ink, lineHeight: 20, marginTop: 8 },
  reply: { marginTop: 10, padding: 10, borderRadius: Radius.sm, backgroundColor: '#F2F4F8' },
});
