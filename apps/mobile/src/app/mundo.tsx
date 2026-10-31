import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, useRouter } from 'expo-router';
import { UN_SOLO_MUNDO } from '@/constants/app-config';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/brand-logo';
import { Emoji } from '@/components/emoji';
import { Pattern } from '@/components/pattern-background';
import { SpeakButton } from '@/components/speak-button';
import { Brand, Radius } from '@/constants/theme';
import { WORLD, type World } from '@/constants/world';
import { useApp } from '@/store/app';

const GOLD = '#C9A13B';
const NAVY = '#13203F';

/** Primera pregunta al cliente: ¿busca un profesionista con carrera o alguien de oficio? */
export default function ElegirMundo() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { actions } = useApp();
  // Expertalia es solo de profesionistas: esta pregunta no aplica
  if (UN_SOLO_MUNDO) return <Redirect href="/cliente" />;

  const pick = (w: World) => {
    actions.setLookingFor(w);
    router.replace('/cliente');
  };

  return (
    <View style={{ flex: 1 }}>
      <Pattern kind="marca" />
      <ScrollView contentContainerStyle={[styles.screen, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 24 }]}>
        {/* Marca */}
        <View style={styles.brandCard}>
          <BrandLogo variant="horizontal" width={250} />
        </View>

        <View style={{ alignItems: 'center', gap: 6 }}>
          <Text style={styles.title}>¿A quién buscas?</Text>
          <Text style={styles.subtitle}>Toca una opción</Text>
          <SpeakButton
            center
            text="¿A quién buscas? Toca la tarjeta azul si buscas un profesionista con carrera, como abogado, contador o psicólogo. Toca la tarjeta café si buscas a alguien de oficio, como plomero, electricista o albañil."
          />
        </View>

        {(['profesionales', 'oficios'] as World[]).map((w) => {
          const t = WORLD[w];
          return (
            <Pressable
              key={w}
              accessibilityRole="button"
              accessibilityLabel={`${t.name}. ${t.sub}. ${t.who}`}
              onPress={() => pick(w)}
              style={({ pressed }) => [styles.door, { backgroundColor: w === 'profesionales' ? NAVY : t.color }, pressed && { transform: [{ scale: 0.98 }], opacity: 0.96 }]}>
              <Pattern kind="sobreColor" />
              <View style={styles.doorRow}>
                <View style={styles.people}>
                  <View style={[styles.face, styles.faceMain]}>
                    <Emoji name={t.people[1]} size={58} />
                  </View>
                  <View style={[styles.face, styles.faceLeft]}>
                    <Emoji name={t.people[0]} size={34} />
                  </View>
                  <View style={[styles.face, styles.faceRight]}>
                    <Emoji name={t.people[2]} size={34} />
                  </View>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.doorTitle}>{t.name}</Text>
                  <Text style={[styles.doorSub, w === 'oficios' && { color: '#FFE0A3' }]}>{t.sub}</Text>
                  <Text style={[styles.doorWho, { color: t.ink }]}>{t.who}</Text>
                </View>
              </View>
              <View style={styles.cta}>
                <Text style={styles.ctaText}>{w === 'profesionales' ? 'Buscar profesionista' : 'Buscar oficio'}</Text>
                <Ionicons name="arrow-forward" size={18} color={NAVY} />
              </View>
            </Pressable>
          );
        })}

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            actions.setRole('negocio');
            router.replace('/mi-negocio/perfil');
          }}
          style={styles.pro}>
          <Emoji name="trabajador" size={30} />
          <View style={{ flex: 1 }}>
            <Text style={styles.proTitle}>¿Eres profesional u oficio?</Text>
            <Text style={styles.proSub}>Crea tu perfil y prueba 30 días gratis</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={NAVY} />
        </Pressable>

        <Text style={styles.note}>Puedes cambiar de opción cuando quieras desde el inicio</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, paddingHorizontal: 20, gap: 16, justifyContent: 'center', maxWidth: 520, width: '100%', alignSelf: 'center' },
  brandCard: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: Radius.xl,
    paddingHorizontal: 18,
    paddingVertical: 12,
    shadowColor: NAVY,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  title: { fontSize: 32, fontWeight: '800', color: NAVY, textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#5B6478', fontWeight: '600' },
  door: {
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(201,161,59,0.7)',
    padding: 18,
    gap: 16,
    overflow: 'hidden',
    shadowColor: NAVY,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  doorRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  people: { width: 112, height: 104 },
  face: { position: 'absolute', backgroundColor: Brand.white, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: GOLD },
  faceMain: { width: 84, height: 84, borderRadius: 42, left: 14, top: 0, zIndex: 2 },
  faceLeft: { width: 50, height: 50, borderRadius: 25, left: 0, bottom: 0, zIndex: 3 },
  faceRight: { width: 50, height: 50, borderRadius: 25, right: 0, bottom: 0, zIndex: 3 },
  doorTitle: { fontSize: 26, fontWeight: '800', color: Brand.white, letterSpacing: -0.3 },
  doorSub: { fontSize: 15, fontWeight: '800', color: GOLD },
  doorWho: { fontSize: 13, lineHeight: 18 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: GOLD, borderRadius: Radius.pill, paddingVertical: 12 },
  ctaText: { fontSize: 16, fontWeight: '800', color: NAVY },
  pro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: Radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(201,161,59,0.45)',
  },
  proTitle: { fontSize: 15, fontWeight: '800', color: NAVY },
  proSub: { fontSize: 13, color: '#5B6478' },
  note: { fontSize: 12, color: '#5B6478', textAlign: 'center' },
});
