import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AdminCard, AdminShell } from '@/components/admin-shell';
import { Button, Chip, Field, OptionPill } from '@/components/ui';
import { Brand } from '@/constants/theme';

const AUDIENCES = [
  { id: 'zona', label: 'Querétaro Centro', reach: 2300 },
  { id: 'municipio', label: 'Todo Querétaro', reach: 4820 },
  { id: 'fiscal', label: 'Buscaron contador', reach: 1240 },
  { id: 'inactivos', label: 'Sin pedir en 30 días', reach: 910 },
];

export default function AdminNotificaciones() {
  const [text, setText] = useState('Este sábado: taller gratis "Impuestos sin miedo" con contadores de Expertalia 360');
  const [aud, setAud] = useState('zona');
  const [sponsored, setSponsored] = useState(false);
  const [sent, setSent] = useState<string[]>([]);
  const a = AUDIENCES.find((x) => x.id === aud)!;

  return (
    <AdminShell title="Notificaciones" subtitle="Push segmentadas, propias o pagadas">
      <AdminCard style={{ gap: 12 }}>
        <Field label="Mensaje" value={text} onChangeText={setText} multiline />
        <Text style={styles.label}>Audiencia</Text>
        <View style={styles.wrap}>
          {AUDIENCES.map((x) => (
            <OptionPill key={x.id} label={x.label} sub={`${x.reach.toLocaleString('es-MX')} personas`} selected={aud === x.id} onPress={() => setAud(x.id)} />
          ))}
        </View>
        <View style={styles.wrap}>
          <OptionPill label="Aviso de Expertalia 360" selected={!sponsored} onPress={() => setSponsored(false)} />
          <OptionPill label="Patrocinada (se cobra)" selected={sponsored} onPress={() => setSponsored(true)} />
        </View>
        <Button
          label={`Enviar a ${a.reach.toLocaleString('es-MX')} personas`}
          disabled={!text.trim()}
          onPress={() => setSent([`${text.trim()} → ${a.label}${sponsored ? ' (patrocinada)' : ''}`, ...sent])}
        />
        <Text style={styles.sub}>Máximo una notificación patrocinada por semana por zona, para no saturar.</Text>
      </AdminCard>
      {sent.map((s, i) => (
        <AdminCard key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Text style={[styles.text, { flex: 1 }]}>{s}</Text>
          <Chip label="Enviada" color={Brand.nopalSoft} ink={Brand.nopalDark} />
        </AdminCard>
      ))}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '800', color: Brand.ink },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sub: { fontSize: 12, color: Brand.inkSoft },
  text: { fontSize: 14, color: Brand.ink },
});
