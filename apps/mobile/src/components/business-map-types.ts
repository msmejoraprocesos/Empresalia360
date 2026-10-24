import type { Business } from '@/data/types';

export type BusinessMapProps = {
  businesses: Business[];
  selected?: string;
  onSelect: (slug: string) => void;
  userLocation?: { lat: number; lng: number } | null;
  /** Mapa fijo (sin arrastrar ni hacer zoom), para el perfil */
  still?: boolean;
  /** Centra el mapa en el seleccionado */
  focus?: boolean;
};
