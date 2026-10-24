import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomBar, Button, Card, EmptyState, Header, IconCircle } from '@/components/ui';
import { Brand, Radius } from '@/constants/theme';
import { money } from '@/lib/format';
import { useApp } from '@/store/app';

export default function Presupuesto() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, actions } = useApp();
  const q = state.quotes.find((x) => x.id === id);
  const [skipOptional, setSkipOptional] = useState<Record<number, boolean>>({});
  if (!q) return <EmptyState icon="document-text-outline" title="Presupuesto no encontrado" text="" />;

  const total = q.lines.reduce((a, l, i) => a + (l.optional && skipOptional[i] ? 0 : l.price), 0);
  const decided = q.status !== 'por_aprobar';

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title={`Presupuesto · ${q.businessName}`} color={Brand.jacaranda} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 220 }}>
        <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <IconCircle icon="document-text-outline" color={Brand.jacarandaSoft} ink={Brand.jacaranda} size={52} square />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{q.vehicle}</Text>
            <Text style={styles.sub}>{q.note}</Text>
          </View>
        </Card>
        <Text style={styles.label}>Detalle</Text>
        <Card style={{ paddingVertical: 4 }}>
          {q.lines.map((l, i) => {
            const skipped = l.optional && skipOptional[i];
            return (
              <View key={l.name} style={[styles.line, i < q.lines.length - 1 && styles.divider]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, skipped && styles.struck]}>{l.name}</Text>
                  <Text style={styles.sub}>{l.detail}</Text>
                  {l.optional && !decided ? (
                    <Pressable onPress={() => setSkipOptional({ ...skipOptional, [i]: !skipped })} accessibilityRole="button" hitSlop={6}>
                      <Text style={styles.optional}>{skipped ? 'Incluir' : 'Quitar (opcional)'}</Text>
                    </Pressable>
                  ) : null}
                </View>
                <Text style={[styles.title, skipped && styles.struck]}>{money(l.price)}</Text>
              </View>
            );
          })}
        </Card>
        <View style={styles.protect}>
          <IconCircle icon="shield-checkmark-outline" color={Brand.nopalSoft} ink={Brand.nopalDark} size={36} />
          <Text style={{ flex: 1, color: '#234A38', fontSize: 13 }}>Al aprobar, el despacho empieza y te escribe para acordar el pago. Pagas directo a él.</Text>
        </View>
      </ScrollView>
      <BottomBar>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={styles.total}>Total</Text>
          <Text style={styles.total}>{money(total)}</Text>
        </View>
        <Text style={styles.sub}>{decided ? (q.status === 'aprobado' ? 'Aprobado. El profesional ya fue avisado y te escribirá para el pago.' : 'Rechazaste este presupuesto.') : q.readyText}</Text>
        {!decided ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label="Rechazar" variant="ghost" style={{ flex: 1 }} onPress={() => actions.setQuoteStatus(q.id, 'rechazado')} />
            <Button label="Aprobar" style={{ flex: 2 }} onPress={() => actions.setQuoteStatus(q.id, 'aprobado')} />
          </View>
        ) : (
          <Button label="Volver a mis citas" variant="dark" onPress={() => router.back()} />
        )}
      </BottomBar>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 15, fontWeight: '700', color: Brand.ink },
  sub: { fontSize: 12, color: Brand.inkSoft, marginTop: 2 },
  label: { fontSize: 14, fontWeight: '800', color: Brand.ink },
  line: { flexDirection: 'row', gap: 10, paddingVertical: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: Brand.line },
  optional: { fontSize: 12, fontWeight: '800', color: Brand.jacaranda, marginTop: 4 },
  struck: { textDecorationLine: 'line-through', color: Brand.inkMuted },
  protect: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, borderRadius: Radius.md, backgroundColor: Brand.nopalSoft },
  total: { fontSize: 17, fontWeight: '800', color: Brand.ink },
});
