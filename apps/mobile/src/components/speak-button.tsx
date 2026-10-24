import { Pressable, StyleSheet, Text } from 'react-native';

import { Brand, Radius } from '@/constants/theme';
import { speak } from '@/lib/voice';

import { Emoji } from './emoji';

/** Botón "Escuchar": lee en voz alta el texto, para quien no lee. */
export function SpeakButton({ text, label = 'Escuchar', dark, compact, center }: { text: string; label?: string; dark?: boolean; compact?: boolean; center?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${text}`}
      onPress={() => speak(text)}
      hitSlop={8}
      style={({ pressed }) => [styles.btn, dark && styles.dark, compact && styles.compact, center && { alignSelf: 'center' }, pressed && { opacity: 0.7 }]}>
      <Emoji name="bocina" size={compact ? 18 : 20} />
      {compact ? null : <Text style={[styles.text, dark && { color: Brand.white }]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36, borderRadius: Radius.pill, backgroundColor: Brand.white, borderWidth: 1, borderColor: Brand.line, alignSelf: 'flex-start' },
  dark: { backgroundColor: 'rgba(255,255,255,0.16)', borderColor: 'rgba(255,255,255,0.28)' },
  compact: { width: 36, paddingHorizontal: 0, justifyContent: 'center' },
  text: { fontSize: 13, fontWeight: '800', color: Brand.ink },
});
