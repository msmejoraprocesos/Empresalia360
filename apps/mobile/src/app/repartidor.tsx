import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Chip, EmptyState, ListRow } from '@/components/ui';
import { Brand, Radius } from '@/constants/theme';
import type { DeliveryJob } from '@/store/app';
import { money } from '@/lib/format';
import { useApp } from '@/store/app';

const NEXT: Partial<Record<DeliveryJob['status'], { label: string; to: DeliveryJob['status'] }>> = {
  aceptado: { label: 'Ya recogí el paquete', to: 'recogido' },
  recogido: { label: 'Entregué (pedir código)', to: 'entregado' },
};

export default function Repartidor() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, actions } = useApp();
  const active = state.jobs.find((j) => j.status === 'aceptado' || j.status === 'recogido');
  const offers = state.jobs.filter((j) => j.status === 'oferta');
  const done = state.jobs.filter((j) => j.status === 'entregado');
  const earned = done.reduce((a, j) => a + j.pay, 0);

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.muted}>Modo mensajero · Jorge V.</Text>
            <Text style={styles.status}>{state.courierAvailable ? 'Disponible' : 'No disponible'}</Text>
          </View>
          <Switch
            value={state.courierAvailable}
            onValueChange={actions.setCourierAvailable}
            accessibilityLabel="Disponible para envíos"
            trackColor={{ true: Brand.nopal, false: '#C5CEDC' }}
            thumbColor={Brand.white}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <View style={styles.stat}>
            <Text style={styles.statBig}>{money(earned)}</Text>
            <Text style={styles.muted}>ganado hoy</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statBig}>{done.length}</Text>
            <Text style={styles.muted}>entregas</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statBig}>4.9 ★</Text>
            <Text style={styles.muted}>calificación</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        {active ? (
          <Card style={{ gap: 10, borderWidth: 2, borderColor: Brand.nopal }}>
            <Chip label={active.status === 'aceptado' ? 'VE A RECOGER' : 'EN CAMINO A ENTREGAR'} color={Brand.nopalSoft} ink={Brand.nopalDark} />
            <JobStops job={active} />
            <Button label="Abrir navegación" variant="dark" icon="navigate" small />
            {NEXT[active.status] ? <Button label={NEXT[active.status]!.label} variant="success" onPress={() => actions.setJobStatus(active.id, NEXT[active.status]!.to)} /> : null}
          </Card>
        ) : null}

        {!state.courierAvailable ? (
          <EmptyState icon="moon-outline" title="No disponible" text="Actívate para recibir envíos de negocios cercanos." />
        ) : active ? null : offers.length ? (
          offers.map((j) => (
            <Card key={j.id} style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                {j.urgent ? <Chip label="URGENTE · entregar en 30 min" color={Brand.chileSoft} ink={Brand.chileDark} /> : <Chip label="Envío normal" />}
                <Text style={styles.pay}>{money(j.pay)}</Text>
              </View>
              <Text style={styles.sub}>{j.km} km en total</Text>
              <JobStops job={j} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button label="Pasar" variant="ghost" style={{ flex: 1 }} onPress={() => actions.setJobStatus(j.id, 'pasado')} />
                <Button label="Aceptar envío" variant="success" style={{ flex: 2 }} onPress={() => actions.setJobStatus(j.id, 'aceptado')} />
              </View>
            </Card>
          ))
        ) : (
          <EmptyState icon="bicycle-outline" title="Esperando envíos" text="Te avisamos cuando un negocio cercano necesite un envío." />
        )}

        <Card style={{ paddingVertical: 4, marginTop: 8 }}>
          <ListRow icon="document-text-outline" title="Mis documentos" subtitle="Identificación y vehículo verificados" onPress={() => {}} />
          <ListRow icon="shield-checkmark-outline" title="Seguro de riesgos de trabajo" subtitle="Cobertura activa mientras estás disponible" onPress={() => {}} />
          <ListRow
            icon="person-outline"
            title="Cambiar a modo cliente"
            onPress={() => {
              actions.setRole('vecino');
              router.replace('/cliente');
            }}
            last
          />
        </Card>
      </ScrollView>
    </View>
  );
}

function JobStops({ job }: { job: DeliveryJob }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.stop}>
        <View style={[styles.letter, { backgroundColor: '#24324A' }]}>
          <Text style={styles.letterText}>A</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>Recoger en {job.pickup}</Text>
          <Text style={styles.sub}>{job.pickupDetail}</Text>
        </View>
      </View>
      <View style={styles.stop}>
        <View style={[styles.letter, { backgroundColor: Brand.chile }]}>
          <Text style={styles.letterText}>B</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>Entregar en {job.dropoff}</Text>
          <Text style={styles.sub}>{job.dropoffDetail}</Text>
        </View>
        <Ionicons name="location" size={20} color={Brand.chile} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: Brand.alberca, paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  muted: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  status: { color: Brand.white, fontSize: 22, fontWeight: '800' },
  stat: { flex: 1, padding: 10, borderRadius: Radius.md, backgroundColor: 'rgba(0,0,0,0.15)' },
  statBig: { color: Brand.white, fontSize: 17, fontWeight: '800' },
  pay: { fontSize: 26, fontWeight: '800', color: Brand.ink },
  name: { fontSize: 14, fontWeight: '800', color: Brand.ink },
  sub: { fontSize: 12, color: Brand.inkSoft, marginTop: 2 },
  stop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  letter: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  letterText: { color: Brand.white, fontWeight: '800', fontSize: 12 },
});
