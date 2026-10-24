import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomBar, Button, Card, EmptyState, Header, OptionPill } from '@/components/ui';
import { Brand, Radius } from '@/constants/theme';
import { getBusiness } from '@/data';
import { money, shortDay } from '@/lib/format';
import { track, useBusinessScreen } from '@/lib/analytics';
import { useApp } from '@/store/app';

const SLOTS = ['09:00', '10:30', '12:00', '13:30', '16:00', '17:30', '18:40', '19:30'];

export default function Reservar() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { actions } = useApp();
  const b = getBusiness(slug);
  const services = b?.items.filter((i) => i.kind === 'cita') ?? [];
  const [itemId, setItemId] = useState(services[0]?.id);
  const [staff, setStaff] = useState(b?.staff?.[0] ?? 'Cualquiera');
  const [days] = useState(() => Array.from({ length: 6 }, (_, i) => new Date(Date.now() + i * 86400000)));
  const [day, setDay] = useState(0);
  const [slot, setSlot] = useState('17:30');
  const [done, setDone] = useState(false);

  useBusinessScreen(b, 'reservar', 'vista_catalogo');
  if (!b) return <EmptyState icon="storefront-outline" title="Negocio no encontrado" text="" />;
  const item = services.find((s) => s.id === itemId) ?? services[0];
  if (!item) return <EmptyState icon="calendar-outline" title="Sin servicios con cita" text="Este negocio no agenda en línea." />;

  const discount = b.promo?.includes('10%') ? Math.round((item.price ?? 0) * 0.1) : 0;
  const total = (item.price ?? 0) - discount;
  const d = days[day];
  const label = `${day === 0 ? 'Hoy' : day === 1 ? 'Mañana' : `${shortDay(d)} ${d.getDate()}`} ${slot}`;
  // Horarios ocupados de ejemplo, distintos por día
  const busy = new Set(SLOTS.filter((_, i) => (i + day) % 3 === 0));

  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
        <Header title="Cita confirmada" back={false} color={Brand.nopal} />
        <View style={{ padding: 24, gap: 14 }}>
          <Text style={styles.bigTitle}>Te esperamos {label.toLowerCase()}</Text>
          <Text style={styles.text}>
            {item.name} en {b.name}
            {staff !== 'Cualquiera' ? ` con ${staff}` : ''}. Te recordamos por WhatsApp 2 horas antes.
          </Text>
          <Button label="Ver mis citas" onPress={() => router.replace('/cliente/pedidos')} />
          <Button label="Volver al negocio" variant="ghost" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title="Reservar" subtitle={b.name} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 240 }}>
        <Text style={styles.label}>Servicio</Text>
        <View style={{ gap: 8 }}>
          {services.map((s) => (
            <Pressable key={s.id} onPress={() => setItemId(s.id)} accessibilityRole="radio" accessibilityState={{ checked: s.id === item.id }}>
              <Card style={[styles.service, s.id === item.id && styles.serviceOn]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceName}>{s.name}</Text>
                  <Text style={styles.text}>{s.durationMin} min</Text>
                </View>
                <Text style={styles.serviceName}>{money(s.price ?? 0)}</Text>
              </Card>
            </Pressable>
          ))}
        </View>

        {b.staff && b.staff.length > 1 ? (
          <>
            <Text style={styles.label}>¿Con quién?</Text>
            <View style={styles.wrap}>
              {b.staff.map((p) => (
                <OptionPill key={p} label={p} selected={staff === p} onPress={() => setStaff(p)} />
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.label}>Día</Text>
        <View style={styles.days}>
          {days.map((dd, i) => (
            <Pressable
              key={i}
              onPress={() => setDay(i)}
              accessibilityRole="button"
              accessibilityState={{ selected: i === day }}
              style={[styles.day, i === day && styles.dayOn]}>
              <Text style={[styles.dayDow, i === day && { color: Brand.white }]}>{i === 0 ? 'Hoy' : shortDay(dd)}</Text>
              <Text style={[styles.dayNum, i === day && { color: Brand.white }]}>{dd.getDate()}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Horario disponible</Text>
        <View style={styles.slots}>
          {SLOTS.map((s) => {
            const taken = busy.has(s);
            const on = s === slot && !taken;
            return (
              <Pressable
                key={s}
                disabled={taken}
                onPress={() => setSlot(s)}
                accessibilityRole="button"
                accessibilityState={{ selected: on, disabled: taken }}
                style={[styles.slot, on && styles.slotOn, taken && { opacity: 0.35 }]}>
                <Text style={[styles.slotText, on && { color: Brand.white }]}>{s}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <BottomBar>
        <View style={styles.line}>
          <Text style={styles.text}>{item.name}</Text>
          <Text style={styles.text}>{money(item.price ?? 0)}</Text>
        </View>
        {discount ? (
          <View style={styles.line}>
            <Text style={[styles.text, { color: Brand.nopalDark, fontWeight: '700' }]}>Beneficio Expertalia 360 10%</Text>
            <Text style={[styles.text, { color: Brand.nopalDark, fontWeight: '700' }]}>−{money(discount)}</Text>
          </View>
        ) : null}
        <View style={styles.line}>
          <Text style={styles.total}>Total en consulta</Text>
          <Text style={styles.total}>{money(total)}</Text>
        </View>
        <Button
          label={`Confirmar · ${label}`}
          disabled={busy.has(slot)}
          onPress={() => {
            track(b, 'seleccion', { itemId: item.id });
            actions.bookAppointment({ business: b, item, staff, label, total });
            setDone(true);
          }}
        />
      </BottomBar>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '800', color: Brand.ink, marginTop: 8 },
  text: { fontSize: 13, color: Brand.inkSoft },
  bigTitle: { fontSize: 24, fontWeight: '800', color: Brand.ink },
  service: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: Brand.white },
  serviceOn: { borderColor: Brand.chile, backgroundColor: Brand.chileSoft },
  serviceName: { fontSize: 15, fontWeight: '700', color: Brand.ink },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  days: { flexDirection: 'row', gap: 8 },
  day: { flex: 1, height: 66, borderRadius: Radius.md, backgroundColor: Brand.white, borderWidth: 1, borderColor: Brand.line, alignItems: 'center', justifyContent: 'center' },
  dayOn: { backgroundColor: Brand.ink, borderColor: Brand.ink },
  dayDow: { fontSize: 12, color: Brand.inkSoft },
  dayNum: { fontSize: 18, fontWeight: '800', color: Brand.ink },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { width: '23%', height: 46, borderRadius: 12, backgroundColor: Brand.white, borderWidth: 1, borderColor: Brand.line, alignItems: 'center', justifyContent: 'center' },
  slotOn: { backgroundColor: Brand.chile, borderColor: Brand.chile },
  slotText: { fontSize: 14, fontWeight: '700', color: Brand.ink },
  line: { flexDirection: 'row', justifyContent: 'space-between' },
  total: { fontSize: 16, fontWeight: '800', color: Brand.ink },
});
