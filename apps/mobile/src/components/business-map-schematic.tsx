import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/theme';
import { categoryBySlug, ZONE } from '@/data';

import type { BusinessMapProps } from './business-map-types';

/**
 * Plano esquemático con los pines en su posición relativa. Se usa en web y en
 * Android mientras no haya llave de Google Maps.
 */
export function SchematicMap({ businesses, selected, onSelect }: BusinessMapProps) {
  const span = 0.012;
  return (
    <View style={styles.map}>
      <View style={[styles.road, { top: '30%', left: 0, right: 0, height: 14 }]} />
      <View style={[styles.road, { top: '62%', left: 0, right: 0, height: 10 }]} />
      <View style={[styles.road, { left: '35%', top: 0, bottom: 0, width: 12 }]} />
      <View style={[styles.road, { left: '72%', top: 0, bottom: 0, width: 9 }]} />
      <View style={styles.park}>
        <Text style={styles.parkText}>Parque</Text>
      </View>
      {businesses.map((b) => {
        const x = ((b.lng - (ZONE.lng - span)) / (2 * span)) * 100;
        const y = ((ZONE.lat + span - b.lat) / (2 * span)) * 100;
        const cat = categoryBySlug(b.categorySlug);
        const on = b.slug === selected;
        return (
          <Pressable
            key={b.slug}
            accessibilityRole="button"
            accessibilityLabel={b.name}
            onPress={() => onSelect(b.slug)}
            style={[
              styles.pin,
              { left: `${Math.min(92, Math.max(4, x))}%`, top: `${Math.min(88, Math.max(4, y))}%`, backgroundColor: cat?.color ?? Brand.chile },
              on && styles.pinOn,
            ]}
          />
        );
      })}
      <View style={styles.me} accessibilityLabel="Tu ubicación" />
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, backgroundColor: '#E6EAF1', overflow: 'hidden' },
  road: { position: 'absolute', backgroundColor: Brand.white },
  park: { position: 'absolute', left: '50%', top: '38%', width: '28%', height: '18%', backgroundColor: '#CFE3C9', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  parkText: { color: '#4E6B47', fontSize: 11 },
  pin: { position: 'absolute', width: 26, height: 26, borderRadius: 13, borderWidth: 3, borderColor: Brand.white, marginLeft: -13, marginTop: -13 },
  pinOn: { width: 38, height: 38, borderRadius: 19, marginLeft: -19, marginTop: -19, borderWidth: 4 },
  me: { position: 'absolute', left: '50%', top: '50%', width: 18, height: 18, borderRadius: 9, backgroundColor: '#2F6FE0', borderWidth: 3, borderColor: Brand.white, marginLeft: -9, marginTop: -9 },
});
