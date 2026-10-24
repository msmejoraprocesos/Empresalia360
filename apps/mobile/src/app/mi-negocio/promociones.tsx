import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { BottomBar, Button, Card, EmptyState, Header } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { useApp } from '@/store/app';

export default function Promociones() {
  const router = useRouter();
  const { state, actions } = useApp();

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title="Promociones" color={Brand.ink} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 130 }}>
        <Card style={{ backgroundColor: Brand.mangoSoft }}>
          <Text style={{ fontWeight: '800', color: '#5A3E00' }}>Promociones globales de Expertalia 360</Text>
          <Text style={{ color: '#5A3E00', marginTop: 4, fontSize: 13 }}>Súmate a la Temporada de declaraciones o al Buen Fin profesional y aparece en el inicio de toda tu zona.</Text>
          <Button label="Ver campañas abiertas" variant="dark" small style={{ marginTop: 10, alignSelf: 'flex-start' }} />
        </Card>
        {state.myPromotions.map((p) => (
          <Card key={p.id} style={{ gap: 8 }}>
            {p.photo ? <Image source={{ uri: p.photo }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 14 }} contentFit="cover" accessibilityLabel={p.title} /> : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <Text style={[styles.name, { flex: 1 }]}>{p.title}</Text>
              <Switch value={p.active} onValueChange={() => actions.togglePromotion(p.id)} accessibilityLabel="Activa" trackColor={{ true: Brand.nopal, false: '#C5CEDC' }} thumbColor={Brand.white} />
            </View>
            <Text style={styles.sub}>
              Para: {p.target} · llega a {p.reach.toLocaleString('es-MX')} personas
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={styles.stat}>
                <Text style={styles.statBig}>{p.redemptions}</Text>
                <Text style={styles.sub}>canjes</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statBig}>{Math.round(p.reach * 0.62)}</Text>
                <Text style={styles.sub}>la vieron</Text>
              </View>
            </View>
          </Card>
        ))}
        {state.myPromotions.length === 0 ? <EmptyState icon="pricetag-outline" title="Sin promociones" text="Crea una para que tus clientes regresen." /> : null}
      </ScrollView>
      <BottomBar>
        <Button label="Nueva promoción" icon="add" onPress={() => router.push('/mi-negocio/promocion-nueva')} />
      </BottomBar>
    </View>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 15, fontWeight: '800', color: Brand.ink },
  sub: { fontSize: 12, color: Brand.inkSoft },
  stat: { flex: 1, padding: 10, borderRadius: 12, backgroundColor: Brand.tortilla },
  statBig: { fontSize: 18, fontWeight: '800', color: Brand.ink },
});
