import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, EmptyState, Field, Header, Segmented } from '@/components/ui';
import { Brand, Radius, TabBarSpace } from '@/constants/theme';
import { ATTEND_ICON, ATTEND_LABEL } from '@/data';
import type { IncomingRequest } from '@/data/types';
import { money } from '@/lib/format';
import { useApp } from '@/store/app';

const PAY: Record<string, string> = { tarjeta: 'pagó con tarjeta', transferencia: 'pagó por transferencia', efectivo: 'paga en efectivo', liga: 'pagó en línea' };

const STATUS: Record<IncomingRequest['status'], { text: string; bg: string; fg: string }> = {
  nueva: { text: 'Nueva', bg: Brand.mango, fg: Brand.ink },
  aceptada: { text: 'Confirmada', bg: Brand.nopalSoft, fg: Brand.nopalDark },
  cotizada: { text: 'Cotización enviada', bg: Brand.jacarandaSoft, fg: Brand.jacaranda },
  rechazada: { text: 'Rechazada', bg: Brand.line, fg: Brand.inkSoft },
};

export default function Solicitudes() {
  const { state } = useApp();
  const [tab, setTab] = useState<'pendientes' | 'atendidas'>('pendientes');
  const pending = state.requests.filter((r) => r.status === 'nueva');
  const done = state.requests.filter((r) => r.status !== 'nueva');
  const list = tab === 'pendientes' ? pending : done;

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title="Solicitudes" subtitle="Citas y cotizaciones que te piden" back={false} color={Brand.ink}>
        <View style={{ marginTop: 14 }}>
          <Segmented
            dark
            value={tab}
            onChange={setTab}
            options={[
              { value: 'pendientes', label: `Por responder (${pending.length})` },
              { value: 'atendidas', label: 'Respondidas' },
            ]}
          />
        </View>
      </Header>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: TabBarSpace }} keyboardShouldPersistTaps="handled">
        {list.map((r) => (
          <RequestCard key={r.id} r={r} />
        ))}
        {list.length === 0 ? (
          <EmptyState icon="mail-open-outline" title={tab === 'pendientes' ? 'Todo al día' : 'Aún no respondes solicitudes'} text="Cuando un cliente te agende o pida cotización, te avisamos con una notificación." />
        ) : null}
      </ScrollView>
    </View>
  );
}

function RequestCard({ r }: { r: IncomingRequest }) {
  const { actions } = useApp();
  const [quoting, setQuoting] = useState(false);
  const [price, setPrice] = useState('');
  const st = STATUS[r.status];

  return (
    <Card style={{ gap: 10 }}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{r.customer}</Text>
          <Text style={styles.sub}>
            {r.type === 'cita' ? 'Quiere una cita' : r.type === 'cotizacion' ? 'Pide cotización' : `Contrató ${money(r.amount ?? 0)} · ${PAY[r.paymentMethod ?? 'tarjeta']}`}
          </Text>
        </View>
        <Chip label={st.text} color={st.bg} ink={st.fg} />
      </View>
      <Text style={styles.detail}>{r.detail}</Text>
      {r.photo ? <Image source={{ uri: r.photo }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 12 }} contentFit="cover" accessibilityLabel="Foto que mandó el cliente" /> : null}
      <View style={styles.meta}>
        <Chip label={r.specialty} color={Brand.chileSoft} ink={Brand.chileDark} />
        <View style={styles.metaItem}>
          <Ionicons name={ATTEND_ICON[r.attend]} size={14} color={Brand.inkSoft} />
          <Text style={styles.sub}>{ATTEND_LABEL[r.attend]}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={14} color={Brand.inkSoft} />
          <Text style={styles.sub}>{r.when}</Text>
        </View>
      </View>

      {r.status === 'cotizada' && r.quotedPrice ? <Text style={styles.quoted}>Cotizaste {money(r.quotedPrice)}</Text> : null}

      {r.status === 'nueva' && r.type !== 'cotizacion' ? (
        <View style={styles.actions}>
          <Button label="Rechazar" variant="ghost" small style={{ flex: 1 }} onPress={() => actions.respondRequest(r.id, 'rechazada')} />
          <Button label={r.type === 'cita' ? 'Confirmar cita' : 'Aceptar y empezar'} small style={{ flex: 1.4 }} onPress={() => actions.respondRequest(r.id, 'aceptada')} />
        </View>
      ) : null}

      {r.status === 'nueva' && r.type === 'cotizacion' ? (
        quoting ? (
          <View style={{ gap: 10 }}>
            <Field label="Honorarios" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="$0" />
            <View style={styles.actions}>
              <Button label="Cancelar" variant="ghost" small style={{ flex: 1 }} onPress={() => setQuoting(false)} />
              <Button label="Enviar cotización" small style={{ flex: 1.4 }} disabled={!Number(price)} onPress={() => actions.respondRequest(r.id, 'cotizada', Number(price))} />
            </View>
          </View>
        ) : (
          <View style={styles.actions}>
            <Button label="No puedo tomarlo" variant="ghost" small style={{ flex: 1 }} onPress={() => actions.respondRequest(r.id, 'rechazada')} />
            <Button label="Cotizar" small style={{ flex: 1.4 }} onPress={() => setQuoting(true)} />
          </View>
        )
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '800', color: Brand.ink },
  sub: { fontSize: 12, color: Brand.inkSoft },
  detail: { fontSize: 14, color: Brand.ink, lineHeight: 20 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  quoted: { fontSize: 14, fontWeight: '800', color: Brand.jacaranda, backgroundColor: Brand.jacarandaSoft, borderRadius: Radius.sm, padding: 8 },
  actions: { flexDirection: 'row', gap: 10 },
});
