import { Image } from 'expo-image';
import type { StyleProp, ImageStyle } from 'react-native';

/** Logo de Expertalia 360 en sus versiones. "claro" es para fondos oscuros (texto blanco). */
const LOGOS = {
  horizontal: { src: require('../../assets/brand/logo-horizontal.png'), ratio: 900 / 178 },
  claro: { src: require('../../assets/brand/logo-horizontal-claro.png'), ratio: 900 / 178 },
  centrado: { src: require('../../assets/brand/logo-centrado.png'), ratio: 600 / 345 },
  icono: { src: require('../../assets/brand/logo-icono.png'), ratio: 320 / 323 },
} as const;

export type LogoVariant = keyof typeof LOGOS;

export function BrandLogo({ variant = 'horizontal', width = 240, style }: { variant?: LogoVariant; width?: number; style?: StyleProp<ImageStyle> }) {
  const l = LOGOS[variant];
  return <Image source={l.src} style={[{ width, height: width / l.ratio }, style]} contentFit="contain" accessibilityLabel="Expertalia 360, expertos en lo que importa" />;
}
