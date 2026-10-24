import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Emoji } from '@/components/emoji';
import { Pattern } from '@/components/pattern-background';
import { SpeakButton } from '@/components/speak-button';
import { Brand, Radius, ShadowStrong } from '@/constants/theme';
import { WORLD, type World } from '@/constants/world';
import { useApp } from '@/store/app';

/** Primera pregunta al cliente: ¿busca un profesionista con carrera o alguien de oficio? */
export default function ElegirMundo() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { actions } = useApp();

  const pick = (w: World) => {
    actions.setLookingFor(w);
    router.replace('/cliente');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <Pattern kind="comunidad" />
      <Text style={styles.title}>¿A quién buscas?</Text>
      <SpeakButton
        center
        text={`¿A quién buscas? Toca la puerta azul si buscas un profesionista con carrera, como abogado, contador o psicólogo. Toca la puerta café si buscas a alguien de oficio, como plomero, electricista o albañil.`}
      />
      {(['profesionales', 'oficios'] as World[]).map((w) => {
        const t = WORLD[w];
        return (
          <Pressable key={w} accessibilityRole="button" accessibilityLabel={`${t.name}. ${t.who}`} onPress={() => pick(w)} style={({ pressed }) => [styles.door, ShadowStrong, { backgroundColor: t.color }, pressed && { transform: [{ scale: 0.98 }] }]}>
            <View style={styles.people}>
              {t.people.map((p, i) => (
                <View key={p} style={[styles.face, i === 1 && { width: 92, height: 92, borderRadius: 46 }]}>
                  <Emoji name={p} size={i === 1 ? 64 : 44} />
                </View>
              ))}
            </View>
            <Text style={styles.doorTitle}>{t.name}</Text>
            <Text style={[styles.doorSub, { color: t.ink }]}>{t.sub}</Text>
            <Text style={[styles.doorWho, { color: t.ink }]}>{t.who}</Text>
          </Pressable>
        );
      })}
      <Text style={styles.note}>Puedes cambiar después con el botón de arriba</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20, gap: 14, justifyContent: 'center' },
  title: { fontSize: 30, fontWeight: '800', color: Brand.ink, textAlign: 'center', letterSpacing: -0.4 },
  door: { borderRadius: Radius.xl, padding: 18, alignItems: 'center', gap: 4 },
  people: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 6 },
  face: { width: 64, height: 64, borderRadius: 32, backgroundColor: Brand.white, alignItems: 'center', justifyContent: 'center' },
  doorTitle: { fontSize: 26, fontWeight: '800', color: Brand.white },
  doorSub: { fontSize: 15, fontWeight: '700' },
  doorWho: { fontSize: 12, textAlign: 'center' },
  note: { fontSize: 12, color: Brand.inkSoft, textAlign: 'center' },
});
