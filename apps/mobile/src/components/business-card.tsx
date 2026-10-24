import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, Radius, Shadow } from '@/constants/theme';
import { ATTEND_ICON, ATTEND_LABEL, categoryBySlug, distanceTo, initials } from '@/data';
import type { Business } from '@/data/types';
import type { Source } from '@/data/stats';
import { markSource } from '@/lib/analytics';
import { distance, money } from '@/lib/format';

import { Chip } from './ui';

/** Avatar con iniciales y el color de la profesión. */
export function ProAvatar({ business, size = 60 }: { business: Business; size?: number }) {
  const cat = categoryBySlug(business.categorySlug);
  const bg = cat?.color === Brand.line ? Brand.inkSoft : cat?.color ?? Brand.chile;
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: cat?.ink === Brand.mango ? Brand.mango : Brand.white, fontWeight: '800', fontSize: size * 0.36 }}>{initials(business.name).toUpperCase()}</Text>
      {business.verified ? (
        <View style={[styles.badge, { width: size * 0.36, height: size * 0.36, borderRadius: size * 0.18 }]}>
          <Ionicons name="checkmark" size={size * 0.22} color={Brand.white} />
        </View>
      ) : null}
    </View>
  );
}

export function consultLabel(b: Business): string | null {
  if (b.consultPrice === undefined) return null;
  const what = b.attends.includes('domicilio') && !b.attends.includes('despacho') ? 'Visita' : 'Consulta';
  return b.consultPrice === 0 ? `${what} sin costo` : `${what} ${money(b.consultPrice)}`;
}

/** Tarjeta de un profesional u oficio en listas y resultados de búsqueda. */
export function BusinessCard({
  business,
  sponsored,
  source = 'otro',
  highlight,
}: {
  business: Business;
  sponsored?: boolean;
  source?: Source;
  /** Especialidad que buscó el cliente, para mostrarla primero */
  highlight?: string;
}) {
  const router = useRouter();
  const specs = highlight && business.specialties.includes(highlight) ? [highlight, ...business.specialties.filter((s) => s !== highlight)] : business.specialties;
  const consult = consultLabel(business);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${business.name}, ${business.profession}`}
      onPress={() => {
        markSource(source);
        router.push(`/negocio/${business.slug}`);
      }}
      style={({ pressed }) => [styles.card, Shadow, pressed && { opacity: 0.85 }]}>
      <View style={styles.row}>
        <ProAvatar business={business} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.name} numberOfLines={1}>
            {business.name}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {business.profession}
            {business.yearsExp ? ` · ${business.yearsExp} años de experiencia` : ''}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="star" size={13} color="#C98A0B" />
            <Text style={styles.meta}>
              <Text style={{ fontWeight: '800', color: Brand.ink }}>{business.rating.toFixed(1)}</Text> · {business.ratingCount} reseñas · {distance(distanceTo(business))}
            </Text>
          </View>
        </View>
      </View>

      {specs.length ? (
        <View style={styles.chips}>
          {specs.slice(0, 3).map((s) => (
            <Chip key={s} label={s} color={s === highlight ? Brand.chile : Brand.chileSoft} ink={s === highlight ? Brand.white : Brand.chileDark} />
          ))}
          {specs.length > 3 ? <Chip label={`+${specs.length - 3}`} /> : null}
        </View>
      ) : null}

      <View style={styles.footer}>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', flex: 1 }}>
          {business.attends.map((a) => (
            <View key={a} style={styles.attend}>
              <Ionicons name={ATTEND_ICON[a]} size={14} color={Brand.inkSoft} />
              <Text style={styles.attendText}>{ATTEND_LABEL[a]}</Text>
            </View>
          ))}
        </View>
        {sponsored ? <Chip label="Destacado" color={Brand.mangoSoft} ink="#5A3E00" /> : consult ? <Text style={styles.consult}>{consult}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Brand.white, borderRadius: Radius.lg, padding: 14, gap: 10 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  badge: { position: 'absolute', right: -4, bottom: -4, backgroundColor: Brand.nopal, borderWidth: 2, borderColor: Brand.white, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '800', color: Brand.ink },
  sub: { fontSize: 13, color: Brand.inkSoft, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  meta: { fontSize: 12, color: Brand.inkSoft, flexShrink: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: Brand.line, paddingTop: 10 },
  attend: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  attendText: { fontSize: 12, color: Brand.inkSoft },
  consult: { fontSize: 13, fontWeight: '800', color: Brand.nopalDark },
});
