import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BusinessMap } from '@/components/business-map';
import { Button, Chip, IconCircle, OptionPill, RoundIconButton } from '@/components/ui';
import { Brand, Radius, ShadowStrong } from '@/constants/theme';
import { BUSINESSES, CATEGORIES, categoryBySlug, distanceTo, getBusiness, primaryAction } from '@/data';
import { markSource } from '@/lib/analytics';
import { distance } from '@/lib/format';

export default function Mapa() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [cat, setCat] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>('lic-mariana-ortiz');
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({});
        setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch {
        // sin ubicación: se usa el centro de la zona
      }
    })();
  }, []);

  const list = cat ? BUSINESSES.filter((b) => b.categorySlug === cat) : BUSINESSES;
  const b = getBusiness(selected);
  const bCat = b ? categoryBySlug(b.categorySlug) : undefined;

  return (
    <View style={{ flex: 1 }}>
      <BusinessMap businesses={list} selected={selected} onSelect={setSelected} userLocation={me} />

      <View style={[styles.top, { top: insets.top + 10 }]}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <RoundIconButton icon="chevron-back" label="Volver" onPress={() => router.back()} />
          <Pressable style={styles.search} onPress={() => router.push('/cliente/explorar')} accessibilityRole="button">
            <Ionicons name="search" size={18} color={Brand.inkSoft} />
            <Text style={{ color: Brand.inkMuted, fontSize: 15 }}>Abogado, contador, notaría…</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 10 }}>
          <OptionPill label="Todo" selected={cat === null} onPress={() => setCat(null)} />
          {CATEGORIES.map((c) => (
            <OptionPill key={c.slug} label={c.name} selected={cat === c.slug} onPress={() => setCat(c.slug)} />
          ))}
        </ScrollView>
      </View>

      {b ? (
        <View style={[styles.sheet, ShadowStrong, { paddingBottom: insets.bottom + 18 }]}>
          <View style={styles.handle} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <IconCircle icon={bCat?.icon ?? 'storefront-outline'} color={bCat?.color ?? Brand.line} ink={bCat?.ink ?? Brand.ink} size={72} square />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{b.name}</Text>
              <Text style={styles.sub}>
                {b.subtitle} · {distance(distanceTo(b))} · {b.isOpen ? 'Abierto' : 'Cerrado'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Ionicons name="star" size={14} color="#C98A0B" />
                <Text style={{ fontWeight: '800', color: Brand.ink }}>{b.rating.toFixed(1)}</Text>
                <Text style={styles.sub}>· {b.ratingCount} reseñas</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {b.modules.includes('ordenar') ? <Chip label="Contratación en línea" /> : null}
                {b.delivers ? <Chip label="A domicilio" /> : null}
                {b.modules.includes('reservar') ? <Chip label="Con cita" /> : null}
                {b.modules.includes('cotizar') ? <Chip label="Cotiza" /> : null}
              </View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <Button label="Ver perfil" variant="ghost" style={{ flex: 1 }} onPress={() => {
                markSource('mapa');
                router.push(`/negocio/${b.slug}`);
              }}
            />
            <Button
              label={primaryAction(b).module === 'ordenar' ? 'Contratar' : primaryAction(b).module === 'reservar' ? 'Reservar' : 'Cotizar'}
              style={{ flex: 1.4 }}
              onPress={() => {
                const a = primaryAction(b).module;
                router.push(a === 'ordenar' ? `/negocio/${b.slug}/menu` : a === 'reservar' ? `/negocio/${b.slug}/reservar` : `/negocio/${b.slug}/cotizar`);
              }}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', left: 16, right: 16 },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    backgroundColor: Brand.white,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: Brand.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Brand.line, alignSelf: 'center', marginBottom: 12 },
  name: { fontSize: 17, fontWeight: '800', color: Brand.ink },
  sub: { fontSize: 13, color: Brand.inkSoft, marginTop: 2 },
});
