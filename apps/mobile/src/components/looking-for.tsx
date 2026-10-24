import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, Radius } from '@/constants/theme';
import type { EmojiName } from '@/constants/emoji';
import { useApp, type LookingFor } from '@/store/app';

import { Emoji } from './emoji';

const OPTIONS: { v: LookingFor; label: string; sub: string; icon: EmojiName }[] = [
  { v: 'todo', label: 'Todo', sub: 'Ver ambos', icon: 'lupa' },
  { v: 'profesionales', label: 'Profesional', sub: 'Abogado, contador', icon: 'portafolio' },
  { v: 'oficios', label: 'Oficio', sub: 'Plomero, técnico', icon: 'caja_herramientas' },
];

/** Selector "¿Qué buscas?": todo, un profesional o un oficio. */
export function LookingForSwitch({ dark }: { dark?: boolean }) {
  const { state, actions } = useApp();
  return (
    <View style={[styles.wrap, dark && { backgroundColor: 'rgba(0,0,0,0.18)' }]} accessibilityRole="radiogroup" accessibilityLabel="¿Qué buscas?">
      {OPTIONS.map((o) => {
        const on = state.lookingFor === o.v;
        const tint = o.v === 'oficios' ? '#8A5A2B' : Brand.chile;
        return (
          <Pressable
            key={o.v}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => actions.setLookingFor(o.v)}
            style={[styles.opt, on && { backgroundColor: Brand.white }]}>
            <Emoji name={o.icon} size={30} />
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.label, { color: on ? tint : dark ? Brand.white : Brand.ink }]}>{o.label}</Text>
              <Text style={[styles.sub, { color: on ? Brand.inkSoft : dark ? '#D6E0F0' : Brand.inkMuted }]} numberOfLines={1}>
                {o.sub}
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
  opt: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 12 },
  label: { fontSize: 14, fontWeight: '800' },
  sub: { fontSize: 10, textAlign: 'center' },
});
