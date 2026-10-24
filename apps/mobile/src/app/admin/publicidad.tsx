import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AdminCard, AdminShell } from '@/components/admin-shell';
import { Button, Chip } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { AD_SLOTS } from '@/data/ads';
import { money } from '@/lib/format';
import { openWhatsApp } from '@/lib/links';
import type { AdCampaign } from '@/store/app';
import { useApp } from '@/store/app';

const STATUS: Record<AdCampaign['status'], { text: string; bg: string; fg: string }> = {
  por_pagar: { text: 'Por pagar', bg: Brand.mangoSoft, fg: '#5A3E00' },
  en_revision: { text: 'En revisión', bg: Brand.albercaSoft, fg: '#1757B8' },
  activa: { text: 'Activa', bg: Brand.nopalSoft, fg: Brand.nopalDark },
  terminada: { text: 'Terminada', bg: Brand.line, fg: Brand.inkSoft },
};

const WEEKS = ['3–9', '10–16', '17–23', '24–30'];
const OCCUPANCY: Record<string, number[]> = { apertura: [12, 14, 9, 4], portada: [3, 3, 2, 0], pin: [4, 4, 3, 1], categoria: [2, 1, 0, 0] };
const CAPACITY: Record<string, number> = { apertura: 20, portada: 3, pin: 5, categoria: 2 };

export default function AdminPublicidad() {
  const router = useRouter();
  const { state, actions } = useApp();

  return (
    <AdminShell title="Publicidad" subtitle="Espacios preferenciales y campañas" action={<Button label="Nueva campaña" small onPress={() => router.push('/admin/campana-nueva')} />}>
      <AdminCard>
        <Text style={styles.h}>Ocupación · Querétaro · noviembre</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ minWidth: 640, gap: 6, marginTop: 12 }}>
            <View style={styles.gridRow}>
              <Text style={[styles.cellLabel, { color: Brand.inkSoft }]} />
              {WEEKS.map((w) => (
                <Text key={w} style={[styles.cellHead]}>
                  {w}
                </Text>
              ))}
            </View>
            {Object.keys(OCCUPANCY).map((k) => {
              const slot = AD_SLOTS.find((s) => s.id === k)!;
              return (
                <View key={k} style={styles.gridRow}>
                  <Text style={styles.cellLabel}>
                    {slot.label} ({CAPACITY[k]})
                  </Text>
                  {OCCUPANCY[k].map((n, i) => {
                    const full = n >= CAPACITY[k];
                    return (
                      <View key={i} style={[styles.cell, full ? { backgroundColor: Brand.chile } : n ? { backgroundColor: '#C8D5EA' } : styles.cellFree]}>
                        <Text style={{ fontWeight: '800', fontSize: 12, color: full ? Brand.white : n ? '#152A4D' : Brand.inkSoft }}>
                          {n ? `${n} de ${CAPACITY[k]}` : 'Libre'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </AdminCard>

      <Text style={styles.h}>Campañas</Text>
      {state.campaigns.map((c) => {
        const st = STATUS[c.status];
        return (
          <AdminCard key={c.id} style={styles.campaign}>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Text style={styles.name}>{c.advertiser}</Text>
              <Text style={styles.sub}>
                {c.slot} · {c.zones} zona{c.zones === 1 ? '' : 's'} · {c.units} periodo{c.units === 1 ? '' : 's'}
              </Text>
            </View>
            <Text style={styles.name}>{money(c.total)}</Text>
            <Chip label={st.text} color={st.bg} ink={st.fg} />
            {c.status === 'en_revision' ? <Button label="Aprobar" variant="success" small onPress={() => actions.setCampaignStatus(c.id, 'activa')} /> : null}
            {c.status === 'por_pagar' ? (
              <Button
                label="Recordarle el pago"
                variant="ghost"
                icon="logo-whatsapp"
                small
                onPress={() => openWhatsApp(`Hola, te recordamos tu campaña en Expertalia 360 (${c.slot}) por ${money(c.total)}. En cuanto se reciba el pago, se publica.`)}
              />
            ) : null}
          </AdminCard>
        );
      })}

      <AdminCard style={{ gap: 6 }}>
        <Text style={styles.h}>Tarifario</Text>
        {AD_SLOTS.map((s) => (
          <View key={s.id} style={styles.tariff}>
            <Text style={styles.text}>{s.label}</Text>
            <Text style={styles.name}>
              {money(s.rate)} por {s.unit} por zona
            </Text>
          </View>
        ))}
        <Text style={styles.sub}>Descuento de 10% para planes Premium y VIP. Tarifas de ejemplo: cámbialas aquí con tus precios.</Text>
      </AdminCard>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 16, fontWeight: '800', color: Brand.ink },
  gridRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  cellLabel: { width: 200, fontSize: 13, fontWeight: '700', color: Brand.ink },
  cellHead: { flex: 1, fontSize: 12, fontWeight: '800', color: Brand.inkSoft },
  cell: { flex: 1, padding: 8, borderRadius: 8 },
  cellFree: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#C5CEDC' },
  campaign: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  name: { fontSize: 14, fontWeight: '800', color: Brand.ink },
  sub: { fontSize: 12, color: Brand.inkSoft, marginTop: 2 },
  text: { fontSize: 14, color: Brand.ink },
  tariff: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Brand.line, gap: 10, flexWrap: 'wrap' },
});
