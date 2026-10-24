import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, RoundIconButton } from '@/components/ui';
import { Brand, Radius } from '@/constants/theme';
import { categoryBySlug, getBusiness } from '@/data';
import type { IconName } from '@/data/types';
import { useBusinessScreen } from '@/lib/analytics';
import { profileLink, shareText, waNumber } from '@/lib/links';

/**
 * Mini sitio público del experto: es lo que se abre al escanear su QR o su liga
 * (PUBLIC_URL?p=<slug>), para quien no tiene la app.
 */
export default function MiniSitio() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const b = getBusiness(slug);
  useBusinessScreen(b, 'mini_sitio', 'vista_perfil', 'mini_sitio');
  if (!b) return <EmptyState icon="globe-outline" title="Sitio no encontrado" text="" />;
  const cat = categoryBySlug(b.categorySlug);
  const url = profileLink(b.slug);

  const links: { label: string; icon: IconName; onPress: () => void; style: 'primary' | 'light' | 'dark' }[] = [
    {
      label: b.modules.includes('reservar') ? 'Agendar cita' : 'Pedir cotización',
      icon: 'storefront-outline',
      style: 'primary',
      onPress: () => router.push((b.modules.includes('reservar') ? `/negocio/${b.slug}/reservar` : `/negocio/${b.slug}/cotizar`) as Href),
    },
    { label: 'Escríbenos por WhatsApp', icon: 'logo-whatsapp', style: 'light', onPress: () => Linking.openURL(`https://wa.me/${waNumber(b.phone)}`) },
    { label: 'Cómo llegar', icon: 'location-outline', style: 'dark', onPress: () => router.push(`/mapa?slug=${b.slug}`) },
    { label: 'Déjanos tu reseña', icon: 'star-outline', style: 'dark', onPress: () => router.push(`/negocio/${b.slug}/resenas`) },
  ];

  return (
    <ScrollView style={{ backgroundColor: '#1B2438' }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 30, paddingHorizontal: 22 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <RoundIconButton icon="chevron-back" label="Volver" bg="#2A3550" color={Brand.white} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <View style={styles.url}>
          <Text style={{ color: '#B9C2D2', fontSize: 12 }} numberOfLines={1}>
            Expertalia 360 · {b.profession}
          </Text>
        </View>
        <RoundIconButton icon="share-outline" label="Compartir liga" bg="#2A3550" color={Brand.white} onPress={() => shareText(`${b.name} en Expertalia 360: ${url}`)} />
      </View>

      <View style={{ alignItems: 'center', marginTop: 26 }}>
        <View style={[styles.logo, { backgroundColor: cat?.color === Brand.line ? Brand.mango : cat?.color }]}>
          <Ionicons name={cat?.icon ?? 'storefront'} size={42} color={Brand.white} />
        </View>
        <Text style={styles.name}>{b.name}</Text>
        <Text style={styles.desc}>{b.description}</Text>
        <Text style={styles.meta}>
          <Text style={{ color: '#F2C14E' }}>★ </Text>
          {b.rating.toFixed(1)} · {b.ratingCount} reseñas en Expertalia 360
        </Text>
      </View>

      <View style={{ gap: 10, marginTop: 24 }}>
        {links.map((l) => (
          <Pressable
            key={l.label}
            onPress={l.onPress}
            accessibilityRole="link"
            style={({ pressed }) => [
              styles.link,
              l.style === 'primary' && { backgroundColor: Brand.chile },
              l.style === 'light' && { backgroundColor: Brand.tortilla },
              pressed && { opacity: 0.85 },
            ]}>
            <Ionicons name={l.icon} size={20} color={l.style === 'light' ? Brand.ink : Brand.white} />
            <Text style={[styles.linkText, l.style === 'light' && { color: Brand.ink }]}>{l.label}</Text>
          </Pressable>
        ))}
      </View>

      {b.promo ? (
        <View style={styles.promo}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#4A3608', letterSpacing: 0.4 }}>PROMO</Text>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#4A3608', marginTop: 2 }}>{b.promo}</Text>
        </View>
      ) : null}

      <Pressable accessibilityRole="button" onPress={() => router.push(`/negocio/${b.slug}`)} style={styles.more}>
        <Text style={{ color: '#B9C2D2', fontWeight: '800' }}>Ver perfil completo, servicios y reseñas ›</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  more: { alignItems: 'center', paddingVertical: 18 },
  url: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill, backgroundColor: '#2A3550' },
  logo: { width: 96, height: 96, borderRadius: 48, borderWidth: 4, borderColor: Brand.chile, alignItems: 'center', justifyContent: 'center' },
  name: { color: Brand.white, fontSize: 28, fontWeight: '800', marginTop: 14, textAlign: 'center' },
  desc: { color: '#E2E7EF', fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 6 },
  meta: { color: '#B9C2D2', fontSize: 13, marginTop: 10 },
  link: { height: 56, borderRadius: Radius.lg, backgroundColor: '#2A3550', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  linkText: { color: Brand.white, fontSize: 16, fontWeight: '700' },
  promo: { marginTop: 18, padding: 14, borderRadius: Radius.lg, backgroundColor: Brand.mangoSoft },
});
