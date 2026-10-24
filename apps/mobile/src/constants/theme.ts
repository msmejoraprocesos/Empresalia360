import { Platform } from 'react-native';

export { Brand } from './brand';

export const Radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 } as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Shadow = Platform.select({
  web: { boxShadow: '0 2px 10px rgba(18,26,43,0.08)' },
  default: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
}) as object;

export const ShadowStrong = Platform.select({
  web: { boxShadow: '0 8px 24px rgba(18,26,43,0.14)' },
  default: {
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
}) as object;

/** Alto aproximado de la barra inferior, para dejar espacio al final de las listas. */
export const TabBarSpace = 110;
