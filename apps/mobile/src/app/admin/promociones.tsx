import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AdminCard, AdminShell } from '@/components/admin-shell';
import { Button, Chip, Field, OptionPill } from '@/components/ui';
import { Brand } from '@/constants/theme';

type Global = { id: string; title: string; scope: string; joined: number; active: boolean };

export default function AdminPromociones() {
  const [list, setList] = useState<Global[]>([
    { id: 'g1', title: 'Temporada de declaraciones', scope: 'Contadores · Querétaro', joined: 12, active: true },
    { id: 'g2', title: 'Buen Fin profesional', scope: 'Toda la app', joined: 0, active: false },
  ]);
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState('Toda la app');

  return (
    <AdminShell title="Promociones globales" subtitle="Campañas para toda la app o una zona; los negocios se suman">
      <AdminCard style={{ gap: 12 }}>
        <Text style={styles.h}>Nueva campaña global</Text>
        <Field label="Nombre" value={title} onChangeText={setTitle} placeholder="Mes del testamento, Regreso a clases…" />
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {['Toda la app', 'Una zona', 'Una categoría'].map((s) => (
            <OptionPill key={s} label={s} selected={scope === s} onPress={() => setScope(s)} />
          ))}
        </View>
        <Button
          label="Crear e invitar negocios"
          disabled={!title.trim()}
          onPress={() => {
            setList([{ id: String(Date.now()), title: title.trim(), scope, joined: 0, active: true }, ...list]);
            setTitle('');
          }}
        />
      </AdminCard>
      {list.map((g) => (
        <AdminCard key={g.id} style={styles.row}>
          <View style={{ flex: 1, minWidth: 200 }}>
            <Text style={styles.name}>{g.title}</Text>
            <Text style={styles.sub}>
              {g.scope} · {g.joined} negocios sumados
            </Text>
          </View>
          <Chip label={g.active ? 'Activa' : 'Borrador'} color={g.active ? Brand.nopalSoft : Brand.line} ink={g.active ? Brand.nopalDark : Brand.inkSoft} />
          <Button label={g.active ? 'Pausar' : 'Activar'} variant="ghost" small onPress={() => setList(list.map((x) => (x.id === g.id ? { ...x, active: !x.active } : x)))} />
        </AdminCard>
      ))}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 16, fontWeight: '800', color: Brand.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  name: { fontSize: 15, fontWeight: '800', color: Brand.ink },
  sub: { fontSize: 12, color: Brand.inkSoft, marginTop: 2 },
});
