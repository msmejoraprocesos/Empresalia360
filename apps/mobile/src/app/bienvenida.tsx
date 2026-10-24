import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { Brand } from '@/constants/theme';
import type { IconName } from '@/data/types';

const SLIDES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'briefcase', title: 'Los expertos que necesitas, en una app', text: 'Abogados, contadores, notarías y más profesionales verificados cerca de ti.' },
  { icon: 'calendar', title: 'Agenda, cotiza y paga en minutos', text: 'Consulta presencial o en línea, cotizaciones por escrito y pago con tarjeta, transferencia o efectivo.' },
  { icon: 'star', title: 'Opiniones de clientes reales', text: 'Solo opina quien fue atendido y cédulas verificadas. Así sabes en quién confiar.' },
];

export default function Bienvenida() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [i, setI] = useState(0);
  const s = SLIDES[i];
  const last = i === SLIDES.length - 1;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 28 }]}>
      <Text style={styles.logo}>
        expertalia<Text style={{ color: Brand.mango }}> 360</Text>
      </Text>

      <View style={styles.hero}>
        <View style={styles.circle}>
          <Ionicons name={s.icon} size={110} color={Brand.white} />
          <View style={styles.badge}>
            <Ionicons name="star" size={22} color={Brand.ink} />
          </View>
        </View>
        <Text style={styles.title}>{s.title}</Text>
        <Text style={styles.text}>{s.text}</Text>
        <View style={styles.dots}>
          {SLIDES.map((_, n) => (
            <Pressable key={n} onPress={() => setI(n)} accessibilityLabel={`Paso ${n + 1}`} hitSlop={8}>
              <View style={[styles.dot, n === i && styles.dotOn]} />
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ gap: 14, alignSelf: 'stretch' }}>
        <Button
          label={last ? 'Empezar' : 'Siguiente'}
          variant="mango"
          onPress={() => (last ? router.push('/elegir-perfil') : setI(i + 1))}
        />
        <Pressable onPress={() => router.push('/elegir-perfil')} accessibilityRole="button" style={{ alignSelf: 'center', padding: 8 }}>
          <Text style={styles.link}>{last ? 'Ya tengo cuenta' : 'Saltar'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.chile, alignItems: 'center', paddingHorizontal: 32 },
  logo: { fontSize: 34, fontWeight: '800', color: Brand.white, letterSpacing: -0.6 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  circle: { width: 220, height: 220, borderRadius: 110, backgroundColor: Brand.chileDark, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 18, right: 10, width: 46, height: 46, borderRadius: 23, backgroundColor: Brand.mango, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 40, fontSize: 30, fontWeight: '800', color: Brand.white, textAlign: 'center', letterSpacing: -0.4 },
  text: { marginTop: 12, fontSize: 15, lineHeight: 22, color: '#D6E0F0', textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 8, marginTop: 26 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4F6E9F' },
  dotOn: { width: 24, backgroundColor: Brand.white },
  link: { color: Brand.white, fontSize: 14, fontWeight: '600' },
});
