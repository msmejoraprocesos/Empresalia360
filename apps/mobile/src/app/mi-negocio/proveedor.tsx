import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Button, Card, Chip, EmptyState, Field, Header } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { money } from '@/lib/format';
import type { ProviderRequest } from '@/store/app';
import { useApp } from '@/store/app';

const PROVIDER_BLUE = '#24324A';

export default function Proveedor() {
  const { state } = useApp();
  const [auto, setAuto] = useState(false);
  const pending = state.providerInbox.filter((p) => p.status === 'nueva');
  const answered = state.providerInbox.filter((p) => p.status !== 'nueva');

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title="Solicitudes de la red" subtitle="Lo que otros despachos te piden" color={PROVIDER_BLUE} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>Respuesta automática</Text>
            <Text style={styles.sub}>Si ofreces ese servicio, responde sola con tu tarifa vigente</Text>
          </View>
          <Switch value={auto} onValueChange={setAuto} accessibilityLabel="Respuesta automática" trackColor={{ true: Brand.nopal, false: '#C5CEDC' }} thumbColor={Brand.white} />
        </Card>
        {pending.map((p) => (
          <RequestCard key={p.id} req={p} />
        ))}
        {pending.length === 0 ? <EmptyState icon="mail-open-outline" title="Sin solicitudes nuevas" text="Cuando un despacho cercano busque un servicio que ofreces, te llega aquí." /> : null}
        {answered.length ? <Text style={styles.label}>Respondidas</Text> : null}
        {answered.map((p) => (
          <Card key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{p.part}</Text>
              <Text style={styles.sub}>{p.from}</Text>
            </View>
            {p.status === 'ofertada' ? (
              <Chip label={`Ofertaste ${money(p.offerPrice ?? 0)}`} color={Brand.nopalSoft} ink={Brand.nopalDark} />
            ) : (
              <Chip label="No lo ofrecías" />
            )}
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

function RequestCard({ req }: { req: ProviderRequest }) {
  const { actions } = useApp();
  const [price, setPrice] = useState('');
  const [ready, setReady] = useState('15 min');
  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.sub}>
          {req.from} · a {req.distanceKm} km
        </Text>
        {req.urgent ? <Chip label="Urgente" color={Brand.chileSoft} ink={Brand.chileDark} /> : null}
      </View>
      <Text style={styles.big}>Busca: {req.part}</Text>
      <Text style={styles.sub}>{req.vehicle}</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label="Honorarios para el despacho" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="$0" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Lista en" value={ready} onChangeText={setReady} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button label="No lo ofrezco" variant="ghost" small style={{ flex: 1 }} onPress={() => actions.answerProvider(req.id, { hasIt: false })} />
        <Button
          label="Enviar oferta"
          small
          style={{ flex: 1.4, backgroundColor: PROVIDER_BLUE }}
          disabled={!Number(price)}
          onPress={() => actions.answerProvider(req.id, { hasIt: true, price: Number(price), readyIn: ready })}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 15, fontWeight: '800', color: Brand.ink },
  big: { fontSize: 18, fontWeight: '800', color: Brand.ink },
  sub: { fontSize: 12, color: Brand.inkSoft, marginTop: 2 },
  label: { fontSize: 14, fontWeight: '800', color: Brand.ink, marginTop: 6 },
});
