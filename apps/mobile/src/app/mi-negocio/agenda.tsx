import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, Chip, Header } from '@/components/ui';
import { Brand, Radius } from '@/constants/theme';
import { shortDay } from '@/lib/format';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useApp } from '@/store/app';

type Slot = { time: string; who?: string; what?: string; source?: 'expertalia' | 'manual'; status?: 'confirmada' | 'sin_confirmar' | 'atendida' | 'nueva' };

const HOURS = ['09:00', '10:00', '11:30', '13:00', '16:00', '17:00', '18:00'];
// Citas de ejemplo (solo sin Supabase)
const DEMO: Slot[] = [
  { time: '09:00', who: 'Jorge P.', what: 'Revisión de contrato de arrendamiento', source: 'manual', status: 'atendida' },
  { time: '13:00', who: 'Pedro S.', what: 'Testamento · revisión de documentos', source: 'expertalia', status: 'confirmada' },
  { time: '17:00', who: 'Rodrigo M.', what: 'Consulta inicial · divorcio', source: 'expertalia', status: 'sin_confirmar' },
];

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/** "Hoy 17:30", "Mañana 10:00", "Lun 26 10:30" → día (0 = hoy) y hora */
function parseWhen(when: string): { day: number; time: string } | null {
  const time = when.match(/(\d{1,2}):(\d{2})/);
  if (!time) return null;
  const t = `${time[1].padStart(2, '0')}:${time[2]}`;
  if (/^hoy/i.test(when)) return { day: 0, time: t };
  if (/^mañana/i.test(when)) return { day: 1, time: t };
  const n = when.match(/\b(\d{1,2})\b(?!:)/);
  if (n) {
    for (let i = 0; i < 7; i++) if (new Date(Date.now() + i * 86400000).getDate() === Number(n[1])) return { day: i, time: t };
  }
  return null;
}

export default function Agenda() {
  const { state, actions } = useApp();
  const [days] = useState(() => Array.from({ length: 6 }, (_, i) => new Date(Date.now() + i * 86400000)));
  const [day, setDay] = useState(0);
  const [form, setForm] = useState<{ time: string } | null>(null);
  const [who, setWho] = useState('');
  const [what, setWhat] = useState('');
  const key = dayKey(days[day]);

  // Citas que llegaron por la app
  const fromApp: Slot[] = state.requests
    .filter((r) => r.type === 'cita' && r.status !== 'rechazada')
    .map((r) => ({ r, w: parseWhen(r.when) }))
    .filter((x) => x.w && x.w.day === day)
    .map(({ r, w }) => ({ time: w!.time, who: r.customer, what: r.detail, source: 'expertalia', status: r.status === 'aceptada' ? 'confirmada' : 'nueva' }));
  const manual: Slot[] = state.agenda.filter((a) => a.day === key).map((a) => ({ time: a.time, who: a.who, what: a.what, source: 'manual', status: 'confirmada' }));
  const demo = !isSupabaseConfigured && day === 0 ? DEMO : [];
  const busy = [...fromApp, ...manual, ...demo];
  const times = Array.from(new Set([...HOURS, ...busy.map((b) => b.time)])).sort();
  const slots: Slot[] = times.map((t) => busy.find((b) => b.time === t) ?? { time: t });
  const blocked = state.blocked;

  const save = () => {
    if (!form) return;
    actions.addAgenda({ day: key, time: form.time, who: who.trim(), what: what.trim() });
    setForm(null);
    setWho('');
    setWhat('');
  };

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title="Agenda" subtitle="Toca un horario libre para apartarlo o bloquearlo" color={Brand.ink} />
      <View style={styles.days}>
        {days.map((d, i) => (
          <Pressable
            key={i}
            onPress={() => {
              setDay(i);
              setForm(null);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: i === day }}
            style={[styles.day, i === day && styles.dayOn]}>
            <Text style={[styles.dow, i === day && { color: Brand.white }]}>{i === 0 ? 'Hoy' : shortDay(d)}</Text>
            <Text style={[styles.num, i === day && { color: Brand.white }]}>{d.getDate()}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 8, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {slots.map((s) => {
          const bKey = `${key}-${s.time}`;
          const isBlocked = blocked.includes(bKey);
          const open = form?.time === s.time;
          return (
            <View key={s.time} style={styles.row}>
              <Text style={styles.time}>{s.time}</Text>
              {s.who ? (
                <Card style={[styles.slot, s.source === 'expertalia' && { backgroundColor: Brand.chileSoft }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.who}>{s.who}</Text>
                    {s.source === 'expertalia' ? <Chip label="POR LA APP" color={Brand.chile} ink={Brand.white} /> : <Chip label="La anotaste tú" />}
                  </View>
                  <Text style={styles.what}>
                    {s.what}
                    {s.status === 'nueva' ? ' · por confirmar en Solicitudes' : s.status === 'sin_confirmar' ? ' · sin confirmar' : s.status === 'atendida' ? ' · atendida' : ''}
                  </Text>
                </Card>
              ) : open ? (
                <Card style={[styles.slot, { gap: 8 }]}>
                  <TextInput value={who} onChangeText={setWho} placeholder="Nombre del cliente" placeholderTextColor={Brand.inkMuted} style={styles.input} autoFocus />
                  <TextInput value={what} onChangeText={setWhat} placeholder="Motivo (ej. consulta, revisión)" placeholderTextColor={Brand.inkMuted} style={styles.input} />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button
                      label={isBlocked ? 'Liberar' : 'Bloquear'}
                      small
                      variant="ghost"
                      style={{ flex: 1 }}
                      onPress={() => {
                        actions.toggleBlocked(bKey);
                        setForm(null);
                      }}
                    />
                    <Button label="Apartar" small style={{ flex: 1.3 }} disabled={who.trim().length < 2} onPress={save} />
                  </View>
                </Card>
              ) : (
                <Pressable
                  onPress={() => setForm({ time: s.time })}
                  accessibilityRole="button"
                  style={[styles.free, isBlocked && { backgroundColor: Brand.line, borderStyle: 'solid' }]}>
                  <Text style={{ color: Brand.inkSoft, fontSize: 13 }}>{isBlocked ? 'Bloqueado · toca para liberar' : 'Libre · toca para apartar'}</Text>
                </Pressable>
              )}
            </View>
          );
        })}
        <Text style={styles.note}>Las citas que te piden por la app aparecen solas. Las que anotes aquí (por teléfono o en persona) bloquean ese horario para que nadie más lo tome.</Text>
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
  input: { height: 44, borderRadius: Radius.sm, borderWidth: 1, borderColor: Brand.line, paddingHorizontal: 12, fontSize: 15, color: Brand.ink, backgroundColor: Brand.white },
  note: { fontSize: 12, color: Brand.inkSoft, lineHeight: 17, marginTop: 8 },
});
