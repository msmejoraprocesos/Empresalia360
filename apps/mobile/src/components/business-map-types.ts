import type { Business } from '@/data/types';

export type BusinessMapProps = {
  businesses: Business[];
  selected?: string;
  onSelect: (slug: string) => void;
  userLocation?: { lat: number; lng: number } | null;
};
