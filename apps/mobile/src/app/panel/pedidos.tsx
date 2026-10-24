import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, EmptyState, Header, Segmented } from '@/components/ui';
import { Brand, Radius, TabBarSpace } from '@/constants/theme';
import type { Order } from '@/data/types';
import { money } from '@/lib/format';
import { useApp } from '@/store/app';

const NEXT_LABEL: Record<string, string> = {
  recibido: 'Aceptar',
  preparando: 'Marcar terminado',
  en_camino: 'Marcar entregado',
};
const STATUS: Record<string, { text: string; bg: string; fg: string }> = {
  recibido: { text: 'Nuevo', bg: Brand.mango, fg: Brand.ink },
  preparando: { text: 'En proceso', bg: Brand.chileSoft, fg: Brand.chileDark },
  en_camino: { text: 'En camino', bg: Brand.albercaSoft, fg: '#1757B8' },
  entregado: { text: 'Terminado', bg: Brand.nopalSoft, fg: Brand.nopalDark },
  cancelado: { text: 'Rechazado', bg: Brand.line, fg: Brand.inkSoft },
};
const PAY: Record<string, string> = { tarjeta: 'Pagado con tarjeta', efectivo: 'Paga en efectivo', transferencia: 'Transferencia', liga: 'Pagado en línea' };

function minutesAgo(t: number) {
  const m = Math.max(1, Math.round((Date.now() - t) / 60000));
  return m < 60 ? `hace ${m} min` : `hace ${Math.round(m / 60)} h`;
}

export default function NegocioPedidos() {
  const { state, actions } = useApp();
  const [tab, setTab] = useState<'activos' | 'hechos'>('activos');
  const active = state.incoming.filter((o) => !['entregado', 'cancelado'].includes(o.status));
  const done = state.incoming.filter((o) => ['entregado', 'cancelado'].includes(o.status));
  const list = tab === 'activos' ? active : done;

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title="Contrataciones" back={false} color={Brand.ink}>
        <View style={{ marginTop: 14 }}>
          <Segmented
            dark
            value={tab}
            onChange={setTab}
            options={[
              { value: 'activos', label: `Activos (${active.length})` },
              { value: 'hechos', label: 'Terminados' },
            ]}
          />
        </View>
      </Header>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: TabBarSpace }}>
        {list.map((o) => (
          <IncomingCard key={o.id} order={o} onNext={() => actions.advanceIncoming(o.id)} onReject={() => actions.rejectIncoming(o.id)} />
        ))}
        {list.length === 0 ? <EmptyState icon="receipt-outline" title="Sin contrataciones aquí" text="Cuando un cliente contrate un servicio, te avisamos con una notificación." /> : null}
      </ScrollView>
    </View>
  );
}

function IncomingCard({ order: o, onNext, onReject }: { order: Order; onNext: () => void; onReject: () => void }) {
  const st = STATUS[o.status] ?? STATUS.recibido;
  const next = o.mode !== 'domicilio' && o.status === 'preparando' ? 'Marcar terminado' : NEXT_LABEL[o.status];
  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={styles.title}>#{o.id.slice(-4).toUpperCase()} · {o.customerName ?? 'Cliente'}</Text>
        <Chip label={st.text} color={st.bg} ink={st.fg} />
      </View>
      <Text style={styles.sub}>
        {o.detail} · {minutesAgo(o.createdAt)}
      </Text>
      {o.mode === 'domicilio' ? (
        <View style={styles.map}>
          <Ionicons name="location" size={28} color={Brand.chile} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', color: Brand.ink }}>{o.customerName} está aquí</Text>
            <Text style={styles.sub}>{o.deliveryNote ?? 'Ubicación compartida por el cliente'}</Text>
          </View>
          <Button label="Ruta" small variant="ghost" icon="navigate-outline" onPress={() => Linking.openURL('https://maps.google.com')} />
        </View>
      ) : null}
      <View style={{ gap: 4 }}>
        {o.lines?.map((l) => (
          <View key={l.itemId} style={styles.line}>
            <Text style={styles.lineText}>
              {l.qty} × {l.name}
            </Text>
            <Text style={styles.lineText}>{money(l.price * l.qty)}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.line, { borderTopWidth: 1, borderTopColor: Brand.line, paddingTop: 10 }]}>
        <Chip label={PAY[o.paymentMethod ?? 'efectivo']} color={o.paymentMethod === 'efectivo' ? Brand.mangoSoft : Brand.nopalSoft} ink={o.paymentMethod === 'efectivo' ? '#5A3E00' : Brand.nopalDark} />
        <Text style={{ fontSize: 17, fontWeight: '800', color: Brand.ink }}>{money(o.total)}</Text>
      </View>
      {next ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {o.status === 'recibido' ? <Button label="Rechazar" variant="ghost" small style={{ flex: 1 }} onPress={onReject} /> : null}
          <Button label={next} variant={o.status === 'recibido' ? 'success' : 'primary'} small style={{ flex: 2 }} onPress={onNext} />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 15, fontWeight: '800', color: Brand.ink },
  sub: { fontSize: 12, color: Brand.inkSoft, marginTop: 2 },
  map: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: Radius.md, backgroundColor: '#E6EAF1' },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lineText: { fontSize: 14, color: Brand.ink },
});
