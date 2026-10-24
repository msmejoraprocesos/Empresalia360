import Constants from 'expo-constants';
import type { ComponentType } from 'react';
import { Platform } from 'react-native';

import { categoryBySlug, ZONE } from '@/data';

import { SchematicMap } from './business-map-schematic';
import type { BusinessMapProps } from './business-map-types';

export type { BusinessMapProps } from './business-map-types';

// En Android, el mapa de Google necesita llave (GOOGLE_MAPS_API_KEY al compilar); sin ella se cierra la app.
const wantsNativeMap = Platform.OS !== 'android' || Boolean(Constants.expoConfig?.extra?.hasAndroidMapsKey);

// Se carga solo si se va a usar, y si el módulo nativo falla se usa el plano esquemático
type Maps = { MapView: ComponentType<Record<string, unknown>>; Marker: ComponentType<Record<string, unknown>> };
let maps: Maps | null | undefined;
function loadMaps(): Maps | null {
  if (maps !== undefined) return maps;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m = require('react-native-maps');
    maps = { MapView: m.default, Marker: m.Marker };
  } catch {
    maps = null;
  }
  return maps;
}

/** Mapa con un pin por negocio, del color de su categoría. */
export function BusinessMap(props: BusinessMapProps) {
  const { businesses, onSelect, userLocation } = props;
  const m = wantsNativeMap ? loadMaps() : null;
  if (!m) return <SchematicMap {...props} />;
  const { MapView, Marker } = m;
  const center = userLocation ?? { lat: ZONE.lat, lng: ZONE.lng };
  return (
    <MapView
      style={{ flex: 1 }}
      initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: 0.018, longitudeDelta: 0.018 }}
      showsUserLocation>
      {businesses.map((b) => (
        <Marker
          key={b.slug}
          coordinate={{ latitude: b.lat, longitude: b.lng }}
          title={b.name}
          description={b.subtitle}
          pinColor={categoryBySlug(b.categorySlug)?.color}
          onPress={() => onSelect(b.slug)}
        />
      ))}
    </MapView>
  );
}
