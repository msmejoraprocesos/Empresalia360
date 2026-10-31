import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, Radius } from '@/constants/theme';
import { WORLD, type World } from '@/constants/world';
import { useApp } from '@/store/app';

import { Emoji } from './emoji';
import { UN_SOLO_MUNDO } from '@/constants/app-config';

/** Cambio de mundo: Profesionistas (con carrera) u Oficios. Nunca se muestran juntos. */
export function LookingForSwitch({ dark }: { dark?: boolean }) {
  const { state, actions } = useApp();
  // Expertalia es solo de profesionistas: no hay mundos que elegir
  if (UN_SOLO_MUNDO) return null;
  return (
    <View style={[styles.wrap, dark && { backgroundColor: 'rgba(0,0,0,0.22)' }]} accessibilityRole="radiogroup" accessibilityLabel="¿Qué buscas?">
      {(['profesionales', 'oficios'] as World[]).map((w) => {
        const on = state.lookingFor === w;
        const t = WORLD[w];
        return (
          <Pressable
            key={w}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`${t.name}: ${t.who}`}
            onPress={() => actions.setLookingFor(w)}
            style={[styles.opt, on && { backgroundColor: Brand.white }]}>
            <Emoji name={t.emoji} size={30} />
            <View style={{ flexShrink: 1 }}>
              <Text style={[styles.label, { color: on ? t.color : dark ? Brand.white : Brand.ink }]}>{t.name}</Text>
              <Text style={[styles.sub, { color: on ? Brand.inkSoft : dark ? t.ink : Brand.inkMuted }]} numberOfLines={1}>
                {t.sub}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: Radius.md, backgroundColor: Brand.line },
  opt: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12 },
  label: { fontSize: 15, fontWeight: '800' },
  sub: { fontSize: 11 },
});
