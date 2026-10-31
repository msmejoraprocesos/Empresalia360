import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Emoji } from '@/components/emoji';
import { SpeakButton } from '@/components/speak-button';
import { Button } from '@/components/ui';
import type { EmojiName } from '@/constants/emoji';
import { BrandLogo } from '@/components/brand-logo';
import { Brand } from '@/constants/theme';
import type { IconName } from '@/data/types';

const SLIDES: { icon: IconName; art: EmojiName[]; title: string; text: string }[] = [
  { icon: 'briefcase', art: ['abogada', 'profesional', 'abaco', 'balanza'], title: 'Profesionistas cerca de ti', text: 'Abogados, contadores, notarios, psicólogos y más. Con cédula verificada.' },
  { icon: 'calendar', art: ['calendario', 'telefono', 'billete', 'pin'], title: 'Agenda y paga fácil', text: 'Toca un botón para agendar, mandar mensaje o pedir precio. Paga como quieras.' },
  { icon: 'star', art: ['estrella', 'pulgar', 'palomita', 'personas'], title: 'Mira las estrellas', text: 'Las estrellas son de clientes reales. Así sabes en quién confiar.' },
];

export default function Bienvenida() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [i, setI] = useState(0);
  const s = SLIDES[i];
  const last = i === SLIDES.length - 1;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 28 }]}>
      <BrandLogo variant="claro" width={260} />

      <View style={styles.hero}>
        <View style={styles.circle}>
          <Emoji name={s.art[0]} size={120} />
          <View style={[styles.mini, { left: -6, bottom: 18 }]}>
            <Emoji name={s.art[1]} size={40} />
          </View>
          <View style={[styles.mini, { right: -4, bottom: 6 }]}>
            <Emoji name={s.art[2]} size={40} />
          </View>
          <View style={styles.badge}>
            <Emoji name={s.art[3]} size={28} />
          </View>
        </View>
        <Text style={styles.title}>{s.title}</Text>
        <Text style={styles.text}>{s.text}</Text>
        <View style={{ marginTop: 14 }}>
          <SpeakButton dark center text={`${s.title}. ${s.text}`} />
        </View>
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
  mini: { position: 'absolute', width: 64, height: 64, borderRadius: 32, backgroundColor: Brand.white, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 6, right: 4, width: 56, height: 56, borderRadius: 28, backgroundColor: Brand.mango, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 40, fontSize: 30, fontWeight: '800', color: Brand.white, textAlign: 'center', letterSpacing: -0.4 },
  text: { marginTop: 12, fontSize: 15, lineHeight: 22, color: '#D6E0F0', textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 8, marginTop: 26 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4F6E9F' },
  dotOn: { width: 24, backgroundColor: Brand.white },
  link: { color: Brand.white, fontSize: 14, fontWeight: '600' },
});
