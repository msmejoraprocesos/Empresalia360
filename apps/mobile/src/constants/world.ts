import { Brand } from './brand';
import type { EmojiName } from './emoji';

/**
 * Los dos mundos de Expertalia 360, que nunca se mezclan:
 * profesionistas (con carrera y cédula) y oficios (técnicos y maestros).
 */
export type World = 'profesionales' | 'oficios';

export const WORLD: Record<World, { name: string; sub: string; who: string; emoji: EmojiName; people: EmojiName[]; color: string; dark: string; soft: string; ink: string }> = {
  profesionales: {
    name: 'Profesionistas',
    sub: 'Con carrera y cédula',
    who: 'Abogados, contadores, notarios, psicólogos, arquitectos',
    emoji: 'portafolio',
    people: ['abogada', 'profesional', 'abogado'],
    color: Brand.chile,
    dark: Brand.chileDark,
    soft: Brand.chileSoft,
    ink: '#D6E0F0',
  },
  oficios: {
    name: 'Oficios',
    sub: 'Técnicos y maestros',
    who: 'Plomeros, electricistas, albañiles, carpinteros, cerrajeros',
    emoji: 'caja_herramientas',
    people: ['trabajador', 'mecanico', 'llave_inglesa'],
    color: '#9A4A12',
    dark: '#6E330B',
    soft: '#F6E6D6',
    ink: '#F6DCC4',
  },
};
