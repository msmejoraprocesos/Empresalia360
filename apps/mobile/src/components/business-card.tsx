import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, Radius, Shadow } from '@/constants/theme';
import { categoryBySlug, distanceTo } from '@/data';
import type { Business } from '@/data/types';
import type { Source } from '@/data/stats';
import { markSource } from '@/lib/analytics';
import { distance } from '@/lib/format';

import { Chip, IconCircle } from './ui';

export function BusinessCard({ business, sponsored, source = 'otro' }: { business: Business; sponsored?: boolean; source?: Source }) {
  const router = useRouter();
  const cat = categoryBySlug(business.categorySlug);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        markSource(source);
        router.push(`/negocio/${business.slug}`);
      }}
      style={({ pressed }) => [styles.card, Shadow, pressed && { opacity: 0.85 }]}>
      <View style={styles.row}>
        <IconCircle icon={cat?.icon ?? 'storefront-outline'} color={cat?.color ?? Brand.line} ink={cat?.ink ?? Brand.ink} size={60} square />
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {business.name}
            </Text>
            {business.verified ? <Ionicons name="checkmark-circle" size={16} color={Brand.nopal} accessibilityLabel="Verificado" /> : null}
          </View>
          <Text style={styles.sub} numberOfLines={1}>
            {business.subtitle} · {distance(distanceTo(business))}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="star" size={13} color="#C98A0B" />
            <Text style={styles.meta}>
              <Text style={{ fontWeight: '800', color: Brand.ink }}>{business.rating.toFixed(1)}</Text> ({business.ratingCount})
            </Text>
            <Text style={[styles.meta, { color: business.isOpen ? Brand.nopalDark : Brand.inkMuted, fontWeight: '700' }]}>
              · {business.isOpen ? 'Abierto' : 'Cerrado'}
            </Text>
          </View>
        </View>
      </View>
      {business.promo || sponsored ? (
        <View style={styles.footer}>
          {business.promo ? <Chip label={business.promo} color={Brand.chileSoft} ink={Brand.chileDark} icon="pricetag" /> : <View />}
          {sponsored ? <Chip label="Patrocinado" /> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Brand.white, borderRadius: Radius.lg, padding: 14, gap: 10 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 16, fontWeight: '800', color: Brand.ink, flexShrink: 1 },
  sub: { fontSize: 13, color: Brand.inkSoft, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  meta: { fontSize: 12, color: Brand.inkSoft },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
});
