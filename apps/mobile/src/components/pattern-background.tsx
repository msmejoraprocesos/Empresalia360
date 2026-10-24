import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { IconName } from '@/data/types';

/**
 * Fondos con dibujos discretos, al estilo del fondo de los chats de WhatsApp.
 * Cada sección tiene el suyo: profesionales (documentos, balanza, calculadora…),
 * oficios (herramientas, agua, luz…) y comunidad (mezcla de ambos).
 */
export type PatternKind = 'profesionales' | 'oficios' | 'comunidad' | 'marca' | 'sobreColor';

const THEMES: Record<PatternKind, { bg: string; ink: string; inks?: string[]; icons: IconName[]; step?: number }> = {
  // Fondo de la marca, como el papel tapiz de WhatsApp: crema con dibujos azul marino y dorados
  marca: {
    bg: '#F2ECE2',
    ink: 'rgba(19,32,63,0.13)',
    inks: ['rgba(19,32,63,0.13)', 'rgba(176,132,32,0.22)', 'rgba(19,32,63,0.10)'],
    icons: ['briefcase-outline', 'hammer-outline', 'chatbubble-ellipses-outline', 'document-text-outline', 'water-outline', 'star-outline', 'calculator-outline', 'flash-outline', 'calendar-outline', 'key-outline', 'heart-outline', 'school-outline', 'construct-outline', 'thumbs-up-outline', 'home-outline', 'call-outline', 'bulb-outline', 'location-outline'],
    step: 42,
  },
  // Dibujos blancos muy suaves para poner sobre tarjetas de color
  sobreColor: {
    bg: 'transparent',
    ink: 'rgba(255,255,255,0.10)',
    icons: ['briefcase-outline', 'hammer-outline', 'star-outline', 'document-text-outline', 'construct-outline', 'chatbubble-outline', 'key-outline', 'school-outline'],
    step: 38,
  },
  profesionales: {
    bg: '#EEF2F9',
    ink: 'rgba(31,58,104,0.09)',
    icons: ['briefcase-outline', 'document-text-outline', 'calculator-outline', 'school-outline', 'ribbon-outline', 'reader-outline', 'pencil-outline', 'library-outline', 'stats-chart-outline', 'shield-checkmark-outline', 'heart-outline', 'business-outline'],
  },
  oficios: {
    bg: '#F6F1EA',
    ink: 'rgba(138,90,43,0.11)',
    icons: ['hammer-outline', 'construct-outline', 'water-outline', 'flash-outline', 'key-outline', 'color-fill-outline', 'build-outline', 'snow-outline', 'home-outline', 'brush-outline', 'bulb-outline', 'cube-outline'],
  },
  comunidad: {
    bg: '#F1F3F8',
    ink: 'rgba(107,79,200,0.09)',
    icons: ['chatbubbles-outline', 'megaphone-outline', 'people-outline', 'star-outline', 'thumbs-up-outline', 'help-buoy-outline', 'hammer-outline', 'briefcase-outline', 'calendar-outline', 'bulb-outline', 'heart-outline', 'key-outline'],
  },
};

const STEP_DEFAULT = 46;
const COLS = 12;
const ROWS = 40;

/** Capa de dibujos; va detrás del contenido (posición absoluta). */
export const Pattern = memo(function Pattern({ kind }: { kind: PatternKind }) {
  const t = THEMES[kind];
  const STEP = t.step ?? STEP_DEFAULT;
  const cells = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = (r * 7 + c * 5) % t.icons.length;
      const rot = ((r * 37 + c * 53) % 50) - 25;
      cells.push(
        <View key={`${r}-${c}`} style={{ pointerEvents: 'none', position: 'absolute', left: c * STEP + (r % 2 ? STEP / 2 : 0) - 10, top: r * STEP - 10, transform: [{ rotate: `${rot}deg` }] }}>
          <Ionicons name={t.icons[i]} size={r % 3 === 0 ? 22 : (r + c) % 4 === 0 ? 15 : 18} color={t.inks ? t.inks[(r * 3 + c) % t.inks.length] : t.ink} />
        </View>,
      );
    }
  }
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: t.bg, overflow: 'hidden', pointerEvents: 'none' }]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {cells}
    </View>
  );
});

/** Contenedor con fondo de dibujos detrás de su contenido. */
export function PatternView({ kind, style, children }: { kind: PatternKind; style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  return (
    <View style={[{ overflow: 'hidden' }, style]}>
      <Pattern kind={kind} />
      {children}
    </View>
  );
}

export const PATTERN_BG = { profesionales: THEMES.profesionales.bg, oficios: THEMES.oficios.bg, comunidad: THEMES.comunidad.bg, marca: THEMES.marca.bg };
