import { Image } from 'expo-image';
import type { StyleProp, ImageStyle } from 'react-native';

import { EMOJI, type EmojiName } from '@/constants/emoji';

/** Dibujo a color (se ve igual en cualquier teléfono). */
export function Emoji({ name, size = 28, style, label }: { name: EmojiName; size?: number; style?: StyleProp<ImageStyle>; label?: string }) {
  return (
    <Image
      source={EMOJI[name]}
      style={[{ width: size, height: size }, style]}
      contentFit="contain"
      accessibilityLabel={label}
      accessible={Boolean(label)}
    />
  );
}
