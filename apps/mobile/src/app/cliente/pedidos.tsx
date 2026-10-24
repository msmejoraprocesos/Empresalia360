import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState, Header, IconCircle, Segmented } from '@/components/ui';
import { Brand, Radius, Shadow, TabBarSpace } from '@/constants/theme';
import type { IconName, Order } from '@/data/types';
import { money } from '@/lib/format';
import { useApp } from '@/store/app';

const TYPE_STYLE: Record<Order['type'], { icon: IconName; color: string }> = {
  pedido: { icon: 'bag-handle', color: Brand.chile },
  cita: { icon: 'calendar', color: Brand.alberca },
  cotizacion: { icon: 'document-text', color: Brand.jacaranda },
};

const STATUS_TEXT: Record<string, { text: string; color: string }> = {
  recibido: { text: 'Recibido', color: Brand.chileDark },
  aceptado: { text: 'Aceptado', color: Brand.chileDark },
  preparando: { text: 'En proceso', color: Brand.chileDark },
  en_camino: { text: 'En camino', color: Brand.chileDark },
  confirmada: { text: 'Confirmada', color: Brand.nopalDark },
  esperando: { text: 'Esperando precio', color: Brand.chileDark },
  entregado: { text: 'Entregado', color: Brand.inkSoft },
  atendida: { text: 'Atendida', color: Brand.inkSoft },
  cancelado: { text: 'Cancelado', color: Brand.inkMuted },
};

const DONE = ['entregado', 'atendida', 'cancelado'];

export default function Pedidos() {
  const router = useRouter();
  const { state } = useApp();
  const [tab, setTab] = useState<'curso' | 'hechos'>('curso');
  const inProgress = state.orders.filter((o) => !DONE.includes(o.status));
  const done = state.orders.filter((o) => DONE.includes(o.status));
  const pendingQuotes = state.quotes.filter((q) => q.status === 'por_aprobar');
  const list = tab === 'curso' ? inProgress : done;

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title="Mis citas y servicios" back={false}>
        <View style={{ marginTop: 16 }}>
          <Segmented
            dark
            value={tab}
            onChange={setTab}
            options={[
              { value: 'curso', label: `En curso (${inProgress.length + pendingQuotes.length})` },
              { value: 'hechos', label: 'Completados' },
            ]}
          />
        </View>
      </Header>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: TabBarSpace }}>
        {tab === 'curso'
          ? pendingQuotes.map((q) => (
              <Pressable key={q.id} onPress={() => router.push(`/presupuesto/${q.id}`)} accessibilityRole="button" style={[styles.row, Shadow]}>
                <IconCircle icon="construct" color={Brand.jacaranda} size={46} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{q.businessName}</Text>
                  <Text style={styles.detail}>Cotización · {q.vehicle}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.amount}>{money(q.lines.reduce((a, l) => a + l.price, 0))}</Text>
                  <Text style={[styles.status, { color: Brand.chileDark }]}>Esperando tu OK</Text>
                </View>
              </Pressable>
            ))
          : null}

        {list.map((o) => {
          const t = TYPE_STYLE[o.type];
          const st = STATUS_TEXT[o.status] ?? { text: o.status, color: Brand.inkSoft };
          const canRate = DONE.includes(o.status) && o.status !== 'cancelado' && !o.rated;
          return (
            <Pressable
              key={o.id}
              accessibilityRole="button"
              onPress={() => (canRate ? router.push(`/calificar/${o.id}`) : router.push(`/negocio/${o.businessSlug}`))}
              style={[styles.row, Shadow]}>
              <IconCircle icon={t.icon} color={t.color} size={46} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {o.businessName}
                </Text>
                <Text style={styles.detail} numberOfLines={1}>
                  {o.detail}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.amount}>{o.total ? money(o.total) : '—'}</Text>
                <Text style={[styles.status, { color: canRate ? Brand.chileDark : st.color }]}>{canRate ? 'Calificar' : st.text}</Text>
              </View>
            </Pressable>
          );
        })}

        {list.length === 0 && (tab === 'hechos' || pendingQuotes.length === 0) ? (
          <EmptyState
            icon="receipt-outline"
            title={tab === 'curso' ? 'Nada en curso' : 'Aún no hay citas atendidas'}
            text="Cuando ordenes, reserves o pidas una cotización, lo verás aquí."
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: Radius.lg, backgroundColor: Brand.white },
  name: { fontSize: 14, fontWeight: '800', color: Brand.ink },
  detail: { fontSize: 12, color: Brand.inkSoft, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '800', color: Brand.ink },
  status: { fontSize: 11, fontWeight: '800', marginTop: 2 },
});
