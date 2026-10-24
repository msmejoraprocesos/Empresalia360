import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomBar, Button, Card, Chip, EmptyState, Header, IconCircle } from '@/components/ui';
import { Brand, Radius } from '@/constants/theme';
import { money } from '@/lib/format';
import { useApp } from '@/store/app';

export default function Respuestas() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, actions } = useApp();
  const r = state.supplyRequests.find((x) => x.id === id);
  if (!r) return <EmptyState icon="cube-outline" title="Solicitud no encontrada" text="" />;

  const offers = r.responses.filter((x) => x.hasIt).sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  const without = r.responses.filter((x) => !x.hasIt);
  const best = offers[0]?.id;
  const chosen = r.responses.find((x) => x.id === (r.chosenId ?? best));

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title="Respuestas" subtitle={r.part} color={Brand.ink} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 220 }}>
        <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <IconCircle icon="cube-outline" color={Brand.albercaSoft} ink="#1757B8" size={52} square />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{r.part}</Text>
            <Text style={styles.sub}>
              {r.vehicle} · {r.qty} doc.{r.forCustomer ? ` · para ${r.forCustomer}` : ''}
            </Text>
            <Text style={[styles.sub, { color: Brand.nopalDark, fontWeight: '700' }]}>
              Enviada a {r.sentTo} proveedores · {r.responses.length} respondieron
            </Text>
          </View>
        </Card>

        {offers.map((o) => {
          const on = o.id === chosen?.id;
          return (
            <Pressable key={o.id} onPress={() => !r.chosenId && actions.chooseSupplier(r.id, o.id)} accessibilityRole="radio" accessibilityState={{ checked: on }}>
              <Card style={[styles.offer, on && styles.offerOn]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View>
                    <Text style={styles.name}>{o.supplier}</Text>
                    <Text style={styles.sub}>
                      {o.distanceKm} km · ★ {o.rating} entre negocios
                    </Text>
                  </View>
                  {o.id === best ? <Chip label="Mejor precio" color={Brand.chileSoft} ink={Brand.chileDark} /> : null}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                  <Text style={{ color: Brand.ink }}>Marca {o.brand} · en existencia</Text>
                  <Text style={styles.price}>{money(o.price ?? 0)}</Text>
                </View>
                <Text style={styles.sub}>Lista en {o.readyIn}</Text>
              </Card>
            </Pressable>
          );
        })}
        {without.map((o) => (
          <View key={o.id} style={styles.none}>
            <Text style={styles.sub}>{o.supplier}: no la tiene</Text>
          </View>
        ))}
      </ScrollView>
      <BottomBar>
        {r.chosenId ? (
          <>
            <Text style={[styles.sub, { color: Brand.nopalDark, fontWeight: '700' }]}>
              Pedido confirmado con {chosen?.supplier}. Un mensajero de la red llevará los documentos.
            </Text>
            <Button label="Volver a mis solicitudes" variant="dark" onPress={() => router.back()} />
          </>
        ) : chosen ? (
          <>
            <Text style={styles.sub}>
              Con {chosen.supplier} · {money(chosen.price ?? 0)}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                label="Al presupuesto"
                variant="outline"
                small
                style={{ flex: 1 }}
                onPress={() => {
                  actions.chooseSupplier(r.id, chosen.id);
                  router.push('/presupuesto/q1');
                }}
              />
              <Button label="Pedir y enviar" small style={{ flex: 1 }} onPress={() => actions.chooseSupplier(r.id, chosen.id)} />
            </View>
          </>
        ) : (
          <Text style={styles.sub}>Esperando respuestas de los proveedores…</Text>
        )}
      </BottomBar>
    </View>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 15, fontWeight: '800', color: Brand.ink },
  sub: { fontSize: 12, color: Brand.inkSoft, marginTop: 2 },
  price: { fontSize: 17, fontWeight: '800', color: Brand.ink },
  offer: { borderWidth: 2, borderColor: Brand.white },
  offerOn: { borderColor: Brand.chile },
  none: { padding: 12, borderRadius: Radius.md, backgroundColor: Brand.line },
});
