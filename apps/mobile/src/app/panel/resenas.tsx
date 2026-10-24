import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, Chip, Header, Stars } from '@/components/ui';
import { Brand, Radius, TabBarSpace } from '@/constants/theme';
import { myBusiness, useApp } from '@/store/app';

export default function NegocioResenas() {
  const { state, actions } = useApp();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const reviews = [...(state.userReviews[myBusiness.slug] ?? []), ...myBusiness.reviews];

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title="Reseñas" subtitle={`★ ${myBusiness.rating.toFixed(1)} · ${myBusiness.ratingCount} reseñas`} back={false} color={Brand.ink} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: TabBarSpace }} keyboardShouldPersistTaps="handled">
        <Card style={{ backgroundColor: Brand.mangoSoft }}>
          <Text style={{ color: '#5A3E00', fontSize: 13, lineHeight: 19 }}>
            Responder rápido y con amabilidad mejora tu posición. Las reseñas no se pueden borrar, pero puedes reportar las ofensivas.
          </Text>
        </Card>
        {reviews.map((r) => {
          const reply = state.replies[r.id] ?? r.reply;
          return (
            <Card key={r.id} style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <Text style={styles.name}>{r.author}</Text>
                  <Stars rating={r.rating} size={12} />
                </View>
                <Text style={styles.small}>{r.dateLabel}</Text>
              </View>
              {r.verified ? <Chip label="Visita verificada" color={Brand.nopalSoft} ink={Brand.nopalDark} icon="checkmark" /> : null}
              <Text style={styles.body}>{r.body}</Text>
              {reply ? (
                <View style={styles.reply}>
                  <Text style={styles.small}>
                    <Text style={{ fontWeight: '800', color: Brand.ink }}>Tu respuesta: </Text>
                    {reply}
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  <TextInput
                    value={drafts[r.id] ?? ''}
                    onChangeText={(t) => setDrafts({ ...drafts, [r.id]: t })}
                    placeholder="Escribe tu respuesta"
                    placeholderTextColor={Brand.inkMuted}
                    style={styles.input}
                    multiline
                    accessibilityLabel={`Responder a ${r.author}`}
                  />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button label="Reportar" variant="ghost" small style={{ flex: 1 }} />
                    <Button
                      label="Responder"
                      variant="dark"
                      small
                      style={{ flex: 2 }}
                      disabled={!(drafts[r.id] ?? '').trim()}
                      onPress={() => actions.replyReview(r.id, (drafts[r.id] ?? '').trim())}
                    />
                  </View>
                </View>
              )}
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 15, fontWeight: '800', color: Brand.ink },
  small: { fontSize: 12, color: Brand.inkSoft },
  body: { fontSize: 14, color: Brand.ink, lineHeight: 20 },
  reply: { padding: 10, borderRadius: Radius.sm, backgroundColor: '#F2F4F8' },
  input: { minHeight: 70, borderRadius: Radius.md, borderWidth: 1, borderColor: Brand.line, padding: 12, fontSize: 14, color: Brand.ink, textAlignVertical: 'top' },
});
