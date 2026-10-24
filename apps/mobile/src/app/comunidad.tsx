import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Header, SectionTitle } from '@/components/ui';
import { Brand, Radius } from '@/constants/theme';
import { useApp } from '@/store/app';

const LEVELS = [
  { name: 'Nuevo', min: 0 },
  { name: 'Cliente', min: 300 },
  { name: 'Cliente Frecuente', min: 1000 },
  { name: 'Embajador', min: 2000 },
];

const ROUTE = [
  { slug: 'despacho-contable-reyes', name: 'Despacho Contable Reyes' },
  { slug: 'lic-mariana-ortiz', name: 'Lic. Mariana Ortiz' },
  { slug: 'notaria-publica-14', name: 'Notaría Pública 14' },
  { slug: 'patricia-luna-seguros', name: 'Patricia Luna · Seguros' },
  { slug: 'rumbo-consultores', name: 'Rumbo Consultores' },
];

export default function Comunidad() {
  const router = useRouter();
  const { state } = useApp();
  const level = [...LEVELS].reverse().find((l) => state.points >= l.min) ?? LEVELS[0];
  const next = LEVELS[LEVELS.indexOf(level) + 1];
  const progress = next ? (state.points - level.min) / (next.min - level.min) : 1;
  const visited = new Set(state.orders.filter((o) => ['entregado', 'atendida', 'confirmada'].includes(o.status)).map((o) => o.businessSlug));
  visited.add('despacho-contable-reyes');
  const routeDone = ROUTE.filter((r) => visited.has(r.slug)).length;

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title="Tu comunidad" subtitle="Zen House · El Marqués" color={Brand.nopal} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <Card style={{ backgroundColor: Brand.ink }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text style={styles.darkMuted}>Tu nivel</Text>
              <Text style={styles.level}>{level.name}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.points}>{state.points.toLocaleString('es-MX')}</Text>
              <Text style={styles.darkMuted}>puntos</Text>
            </View>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progress, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <Text style={styles.darkMuted}>{next ? `${next.min - state.points} puntos para ser ${next.name}` : 'Eres Embajador de Expertalia 360'}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            {[
              ['+20', 'por pedir'],
              ['+50', 'por reseñar'],
              ['+100', 'por recomendar'],
            ].map(([a, b]) => (
              <View key={b} style={styles.earn}>
                <Text style={{ color: Brand.white, fontWeight: '800', fontSize: 16 }}>{a}</Text>
                <Text style={styles.darkMuted}>{b}</Text>
              </View>
            ))}
          </View>
        </Card>

        <SectionTitle title="Ruta del mes" action={`${routeDone} de ${ROUTE.length}`} />
        <Card style={{ gap: 4 }}>
          <Text style={styles.sub}>Visita los 5 negocios y gana un kit de regalo de la zona.</Text>
          {ROUTE.map((r) => {
            const done = visited.has(r.slug);
            return (
              <Text key={r.slug} onPress={() => router.push(`/negocio/${r.slug}`)} style={styles.routeRow} accessibilityRole="link">
                <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={done ? Brand.nopal : Brand.inkMuted} />
                {'  '}
                <Text style={{ color: done ? Brand.inkSoft : Brand.ink, fontWeight: done ? '500' : '700' }}>{r.name}</Text>
              </Text>
            );
          })}
        </Card>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <Card style={{ flex: 1, backgroundColor: Brand.chileSoft }}>
            <Text style={[styles.tag, { color: Brand.chileDark }]}>PRÓXIMO EVENTO</Text>
            <Text style={styles.cardTitle}>Taller: impuestos sin miedo</Text>
            <Text style={styles.sub}>Sáb 15 nov · en línea</Text>
          </Card>
          <Card style={{ flex: 1, backgroundColor: Brand.nopalSoft }}>
            <Text style={[styles.tag, { color: Brand.nopalDark }]}>TU EMBAJADORA</Text>
            <Text style={styles.cardTitle}>Laura M.</Text>
            <Text style={[styles.sub, { color: Brand.nopalDark, fontWeight: '700' }]} onPress={() => Linking.openURL('https://wa.me/')}>
              Escribirle
            </Text>
          </Card>
        </View>

        <SectionTitle title="Recomienda a un experto" />
        <Card style={{ gap: 10 }}>
          <Text style={styles.sub}>Cuando tu invitado contrate su primer servicio, los dos ganan 100 puntos.</Text>
          <Button label="Compartir mi invitación" icon="share-social-outline" variant="dark" />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  darkMuted: { color: '#B7C1D3', fontSize: 12, marginTop: 2 },
  level: { color: Brand.white, fontSize: 24, fontWeight: '800', marginTop: 2 },
  points: { color: Brand.white, fontSize: 24, fontWeight: '800' },
  progressBg: { height: 8, borderRadius: 4, backgroundColor: '#2A3550', marginTop: 14, overflow: 'hidden' },
  progress: { height: 8, borderRadius: 4, backgroundColor: '#4F6E9F' },
  earn: { flex: 1, padding: 10, borderRadius: Radius.md, backgroundColor: '#1B2438' },
  sub: { fontSize: 13, color: Brand.inkSoft, lineHeight: 19 },
  routeRow: { paddingVertical: 8, fontSize: 15 },
  tag: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: Brand.ink, marginTop: 6 },
});
