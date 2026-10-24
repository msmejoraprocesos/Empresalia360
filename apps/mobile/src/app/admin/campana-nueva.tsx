import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AdminCard, AdminShell } from '@/components/admin-shell';
import { Button, Field, OptionPill, Stepper } from '@/components/ui';
import { Brand, Radius } from '@/constants/theme';
import { AD_SLOTS } from '@/data/ads';
import { money } from '@/lib/format';
import { useApp } from '@/store/app';

export default function CampanaNueva() {
  const router = useRouter();
  const { actions } = useApp();
  const [advertiser, setAdvertiser] = useState('Despacho Contable Reyes');
  const [external, setExternal] = useState(false);
  const [slot, setSlot] = useState('portada');
  const [zones, setZones] = useState(1);
  const [units, setUnits] = useState(2);
  const s = AD_SLOTS.find((x) => x.id === slot)!;
  const base = s.rate * zones * units;
  const discount = external ? 0 : base * 0.1;
  const iva = (base - discount) * 0.16;
  const total = Math.round(base - discount + iva);

  return (
    <AdminShell title="Nueva campaña" subtitle="Administración / Publicidad">
      <View style={styles.row}>
        <View style={{ flexGrow: 999, flexBasis: 420, gap: 16 }}>
          <AdminCard style={{ gap: 12 }}>
            <Text style={styles.h}>1 · Anunciante</Text>
            <Field label="Negocio o marca" value={advertiser} onChangeText={setAdvertiser} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <OptionPill label="Negocio de Expertalia 360" selected={!external} onPress={() => setExternal(false)} />
              <OptionPill label="Marca externa" selected={external} onPress={() => setExternal(true)} />
            </View>
          </AdminCard>
          <AdminCard style={{ gap: 12 }}>
            <Text style={styles.h}>2 · Espacio</Text>
            <View style={styles.slots}>
              {AD_SLOTS.map((x) => {
                const on = x.id === slot;
                return (
                  <Pressable key={x.id} onPress={() => setSlot(x.id)} accessibilityRole="radio" accessibilityState={{ checked: on }} style={[styles.slot, on && styles.slotOn]}>
                    <Text style={styles.name}>{x.label}</Text>
                    <Text style={styles.sub}>{x.where}</Text>
                    <Text style={[styles.sub, { fontWeight: '800', color: on ? Brand.chileDark : Brand.inkSoft }]}>
                      {money(x.rate)} por {x.unit} por zona
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </AdminCard>
          <AdminCard style={{ gap: 14 }}>
            <Text style={styles.h}>3 · Segmentación y fechas</Text>
            <View style={styles.stepRow}>
              <Text style={styles.text}>Zonas</Text>
              <Stepper value={zones} onChange={(n) => setZones(Math.max(1, Math.min(8, n)))} />
            </View>
            <View style={styles.stepRow}>
              <Text style={styles.text}>{s.unit === 'semana' ? 'Semanas' : s.unit === 'mes' ? 'Meses' : 'Envíos'}</Text>
              <Stepper value={units} onChange={(n) => setUnits(Math.max(1, Math.min(12, n)))} />
            </View>
            <Text style={styles.sub}>Inicio: lunes próximo · disponibilidad confirmada en el calendario</Text>
          </AdminCard>
        </View>

        <AdminCard style={{ flexGrow: 1, flexBasis: 300, backgroundColor: Brand.ink, gap: 10 }}>
          <Text style={{ color: '#B7C1D3', fontSize: 12 }}>Vista previa en la app</Text>
          <View style={styles.preview}>
            <View style={{ height: 70, borderRadius: 10, backgroundColor: Brand.albercaSoft }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <Text style={styles.name}>{advertiser || 'Anunciante'}</Text>
              <Text style={{ fontSize: 10, fontWeight: '800', color: Brand.inkSoft }}>Patrocinado</Text>
            </View>
          </View>
          {[
            ['Espacio', s.label],
            ['Cálculo', `${money(s.rate)} × ${zones} × ${units}`],
            ['Descuento de plan', external ? '—' : `−${money(discount)}`],
            ['IVA', money(iva)],
          ].map(([a, b]) => (
            <View key={a} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#B7C1D3', fontSize: 13 }}>{a}</Text>
              <Text style={{ color: Brand.white, fontSize: 13 }}>{b}</Text>
            </View>
          ))}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', borderTopWidth: 1, borderTopColor: '#27324C', paddingTop: 12 }}>
            <Text style={{ color: Brand.white }}>Total</Text>
            <Text style={{ color: Brand.mango, fontSize: 30, fontWeight: '800' }}>{money(total)}</Text>
          </View>
          <Button
            label="Enviar liga de pago al anunciante"
            onPress={() => {
              actions.createCampaign({ advertiser, slot: s.label, zones, units, total });
              router.replace('/admin/publicidad');
            }}
          />
          <Text style={{ color: '#B7C1D3', fontSize: 11, textAlign: 'center' }}>Se publica cuando esté pagada y aprobada</Text>
        </AdminCard>
      </View>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' },
  h: { fontSize: 16, fontWeight: '800', color: Brand.ink },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slot: { flexGrow: 1, flexBasis: 200, padding: 12, borderRadius: Radius.md, borderWidth: 1, borderColor: Brand.line, gap: 3 },
  slotOn: { borderWidth: 2, borderColor: Brand.chile, backgroundColor: Brand.chileSoft },
  name: { fontSize: 14, fontWeight: '800', color: Brand.ink },
  sub: { fontSize: 12, color: Brand.inkSoft },
  text: { fontSize: 15, color: Brand.ink, fontWeight: '600' },
  stepRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  preview: { padding: 12, borderRadius: 14, backgroundColor: Brand.tortilla },
});
