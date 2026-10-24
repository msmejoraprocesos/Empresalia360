import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, Header } from '@/components/ui';
import { Brand, Radius } from '@/constants/theme';
import { shortDay } from '@/lib/format';

type Slot = { time: string; who?: string; what?: string; source?: 'expertalia' | 'mostrador'; status?: 'confirmada' | 'sin_confirmar' | 'atendida' };

const BASE: Slot[] = [
  { time: '09:00', who: 'Jorge P.', what: 'Pastel de cumpleaños · recoger', source: 'mostrador', status: 'atendida' },
  { time: '10:30' },
  { time: '12:00', who: 'Laura M.', what: 'Pastel personalizado · recoger', source: 'expertalia', status: 'confirmada' },
  { time: '13:30' },
  { time: '16:00', who: 'Ana G.', what: 'Mesa para 4', source: 'expertalia', status: 'confirmada' },
  { time: '17:30', who: 'Rodrigo M.', what: 'Mesa para 2', source: 'expertalia', status: 'sin_confirmar' },
  { time: '19:00' },
];

export default function Agenda() {
  const [days] = useState(() => Array.from({ length: 6 }, (_, i) => new Date(Date.now() + i * 86400000)));
  const [day, setDay] = useState(0);
  const [blocked, setBlocked] = useState<string[]>([]);
  const slots = day === 0 ? BASE : BASE.map((s, i) => (i % 2 === day % 2 ? { time: s.time } : s));

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title="Agenda" subtitle="Toca un horario libre para bloquearlo" color={Brand.ink} />
      <View style={styles.days}>
        {days.map((d, i) => (
          <Pressable key={i} onPress={() => setDay(i)} accessibilityRole="button" accessibilityState={{ selected: i === day }} style={[styles.day, i === day && styles.dayOn]}>
            <Text style={[styles.dow, i === day && { color: Brand.white }]}>{i === 0 ? 'Hoy' : shortDay(d)}</Text>
            <Text style={[styles.num, i === day && { color: Brand.white }]}>{d.getDate()}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 8, paddingBottom: 40 }}>
        {slots.map((s) => {
          const key = `${day}-${s.time}`;
          const isBlocked = blocked.includes(key);
          return (
            <View key={s.time} style={styles.row}>
              <Text style={styles.time}>{s.time}</Text>
              {s.who ? (
                <Card style={[styles.slot, s.source === 'expertalia' && { backgroundColor: Brand.chileSoft }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.who}>{s.who}</Text>
                    {s.source === 'expertalia' ? <Chip label="EXPERTALIA" color={Brand.chile} ink={Brand.white} /> : null}
                  </View>
                  <Text style={styles.what}>
                    {s.what} · {s.status === 'confirmada' ? 'confirmó por WhatsApp' : s.status === 'atendida' ? 'atendida' : 'sin confirmar'}
                  </Text>
                </Card>
              ) : (
                <Pressable
                  onPress={() => setBlocked(isBlocked ? blocked.filter((b) => b !== key) : [...blocked, key])}
                  accessibilityRole="button"
                  style={[styles.free, isBlocked && { backgroundColor: Brand.line, borderStyle: 'solid' }]}>
                  <Text style={{ color: Brand.inkSoft, fontSize: 13 }}>{isBlocked ? 'Bloqueado · toca para liberar' : 'Libre'}</Text>
                </Pressable>
              )}
            </View>
          );
        })}
        <Button label="Nueva cita manual" variant="dark" icon="add" style={{ marginTop: 8 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  days: { flexDirection: 'row', gap: 8, padding: 16 },
  day: { flex: 1, height: 62, borderRadius: Radius.md, backgroundColor: Brand.white, borderWidth: 1, borderColor: Brand.line, alignItems: 'center', justifyContent: 'center' },
  dayOn: { backgroundColor: Brand.ink, borderColor: Brand.ink },
  dow: { fontSize: 12, color: Brand.inkSoft },
  num: { fontSize: 17, fontWeight: '800', color: Brand.ink },
  row: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  time: { width: 50, paddingTop: 14, fontSize: 13, color: Brand.inkSoft, fontWeight: '700' },
  slot: { flex: 1, padding: 12 },
  who: { fontSize: 14, fontWeight: '800', color: Brand.ink },
  what: { fontSize: 12, color: Brand.inkSoft, marginTop: 2 },
  free: { flex: 1, minHeight: 52, borderRadius: Radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: '#CBD3DF', justifyContent: 'center', paddingHorizontal: 12 },
});
