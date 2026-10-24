import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { consultLabel, ProAvatar } from '@/components/business-card';
import { BusinessMap } from '@/components/business-map';
import { Emoji } from '@/components/emoji';
import { Button, Chip, RoundIconButton } from '@/components/ui';
import { Brand, Radius, Shadow, ShadowStrong } from '@/constants/theme';
import { BUSINESSES, CATEGORIES, distanceTo, getBusiness, primaryAction } from '@/data';
import { markSource } from '@/lib/analytics';
import { distance } from '@/lib/format';
import { WORLD } from '@/constants/world';
import { useApp } from '@/store/app';

type Group = 'profesionales' | 'oficios';

export default function Mapa() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ slug?: string }>();
  const { state, actions } = useApp();
  const group: Group = state.lookingFor;
  const setGroup = (g: Group) => actions.setLookingFor(g);
  const [cat, setCat] = useState<string | null>(null);
  const [urgent, setUrgent] = useState(false);
  const [openNow, setOpenNow] = useState(false);
  const [legend, setLegend] = useState(false);
  const [selected, setSelected] = useState<string | undefined>(params.slug ?? 'lic-mariana-ortiz');
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  void state.profileVersion;

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

  const cats = CATEGORIES.filter((c) => c.group === group);
  const list = BUSINESSES.filter(
    (x) => cats.some((c) => c.slug === x.categorySlug) && (!cat || x.categorySlug === cat) && (!urgent || x.urgent24) && (!openNow || x.isOpen),
  );
  const b = getBusiness(selected);
  const shown = b && list.includes(b) ? b : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <BusinessMap businesses={list} selected={shown?.slug} onSelect={setSelected} userLocation={me} focus={Boolean(params.slug)} />

      <View style={[styles.top, { top: insets.top + 10 }]} pointerEvents="box-none">
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <RoundIconButton icon="chevron-back" label="Volver" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          <Pressable style={[styles.search, Shadow]} onPress={() => router.push('/cliente/explorar')} accessibilityRole="button">
            <Ionicons name="search" size={18} color={Brand.inkSoft} />
            <Text style={{ color: Brand.inkMuted, fontSize: 15 }}>Abogado, plomero, contador…</Text>
          </Pressable>
          <RoundIconButton icon={legend ? 'close' : 'color-palette-outline'} label="Colores del mapa" onPress={() => setLegend(!legend)} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 10 }}>
          {(['profesionales', 'oficios'] as Group[]).map((g) => (
            <Pressable
              key={g}
              accessibilityRole="button"
              accessibilityState={{ selected: group === g }}
              onPress={() => {
                setGroup(g);
                setCat(null);
              }}
              style={[styles.pill, Shadow, group === g && { backgroundColor: WORLD[g].color }]}>
              <Text style={[styles.pillText, group === g && { color: Brand.white }]}>{g === 'profesionales' ? 'Profesionistas' : 'Oficios'}</Text>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" onPress={() => setUrgent(!urgent)} style={[styles.pill, Shadow, urgent && { backgroundColor: '#A32020' }]}>
            <Ionicons name="flash" size={13} color={urgent ? Brand.white : '#A32020'} />
            <Text style={[styles.pillText, urgent && { color: Brand.white }]}>Urgencias 24 h</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setOpenNow(!openNow)} style={[styles.pill, Shadow, openNow && { backgroundColor: Brand.nopal }]}>
            <Text style={[styles.pillText, openNow && { color: Brand.white }]}>Disponibles ahora</Text>
          </Pressable>
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 8 }}>
          {cats.map((c) => {
            const on = cat === c.slug;
            const color = c.color === Brand.line ? Brand.inkSoft : c.color;
            return (
              <Pressable key={c.slug} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setCat(on ? null : c.slug)} style={[styles.catPill, Shadow, on && { backgroundColor: color }]}>
                <View style={[styles.dot, { backgroundColor: on ? Brand.white : color }]} />
                <Emoji name={c.emoji} size={18} />
                <Text style={[styles.catText, on && { color: c.ink === Brand.ink ? Brand.ink : Brand.white }]}>{c.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {legend ? (
          <View style={[styles.legend, ShadowStrong]}>
            <Text style={styles.legendTitle}>Colores del mapa</Text>
            {CATEGORIES.map((c) => (
              <View key={c.slug} style={styles.legendRow}>
                <View style={[styles.legendPin, { backgroundColor: c.color === Brand.line ? Brand.inkSoft : c.color }]} />
                <Emoji name={c.emoji} size={22} />
                <Text style={styles.legendText}>{c.name}</Text>
                <Text style={styles.legendCount}>{BUSINESSES.filter((x) => x.categorySlug === c.slug).length}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {shown ? (
        <View style={[styles.sheet, ShadowStrong, { paddingBottom: insets.bottom + 18 }]}>
          <View style={styles.handle} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <ProAvatar business={shown} size={64} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name} numberOfLines={1}>
                {shown.name}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                {shown.profession} · {distance(distanceTo(shown))} · {shown.isOpen ? 'Disponible' : 'Fuera de horario'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Ionicons name="star" size={14} color="#C98A0B" />
                <Text style={{ fontWeight: '800', color: Brand.ink }}>{shown.rating.toFixed(1)}</Text>
                <Text style={styles.sub}>· {shown.ratingCount} reseñas</Text>
                {consultLabel(shown) ? <Text style={[styles.sub, { color: Brand.nopalDark, fontWeight: '700' }]}> · {consultLabel(shown)}</Text> : null}
              </View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {shown.urgent24 ? <Chip label="Urgencias 24 h" color="#FDE2E2" ink="#A32020" icon="flash" /> : null}
            {shown.specialties.slice(0, 3).map((s) => (
              <Chip key={s} label={s} color={Brand.chileSoft} ink={Brand.chileDark} />
            ))}
          </View>
          <View style={styles.address}>
            <Ionicons name="location" size={16} color={Brand.chile} />
            <Text style={styles.addressText} numberOfLines={2}>
              {shown.address}, {shown.zone}
              {shown.references ? ` · ${shown.references}` : ''}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Button
              label="Ver perfil"
              variant="ghost"
              style={{ flex: 1 }}
              onPress={() => {
                markSource('mapa');
                router.push(`/negocio/${shown.slug}`);
              }}
            />
            <Button
              label={primaryAction(shown).module === 'reservar' ? 'Agendar' : 'Cotizar'}
              style={{ flex: 1.4 }}
              onPress={() => {
                markSource('mapa');
                router.push(primaryAction(shown).module === 'reservar' ? `/negocio/${shown.slug}/reservar` : `/negocio/${shown.slug}/cotizar`);
              }}
            />
          </View>
        </View>
      ) : (
        <View style={[styles.empty, ShadowStrong, { bottom: insets.bottom + 20 }]}>
          <Text style={styles.sub}>{list.length ? `${list.length} expertos en el mapa · toca un pin` : 'Ningún experto con estos filtros'}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', left: 16, right: 16, zIndex: 1000 },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 44, paddingHorizontal: 14, borderRadius: Radius.md, backgroundColor: Brand.white },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Brand.white },
  pillDark: { backgroundColor: Brand.ink },
  pillText: { fontSize: 13, fontWeight: '700', color: Brand.ink },
  catPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.pill, backgroundColor: Brand.white },
  catText: { fontSize: 12, fontWeight: '600', color: Brand.ink },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legend: { marginTop: 10, alignSelf: 'flex-end', backgroundColor: Brand.white, borderRadius: Radius.md, padding: 12, gap: 6, minWidth: 220 },
  legendTitle: { fontSize: 13, fontWeight: '800', color: Brand.ink, marginBottom: 2 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendPin: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  legendText: { flex: 1, fontSize: 12, color: Brand.ink },
  legendCount: { fontSize: 12, fontWeight: '800', color: Brand.inkSoft, fontVariant: ['tabular-nums'] },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: Brand.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, zIndex: 1000 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Brand.line, alignSelf: 'center', marginBottom: 12 },
  name: { fontSize: 17, fontWeight: '800', color: Brand.ink },
  sub: { fontSize: 13, color: Brand.inkSoft, marginTop: 2 },
  address: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginTop: 10, backgroundColor: Brand.tortilla, borderRadius: Radius.sm, padding: 10 },
  addressText: { flex: 1, fontSize: 13, color: Brand.ink, lineHeight: 18 },
  empty: { position: 'absolute', alignSelf: 'center', backgroundColor: Brand.white, borderRadius: Radius.pill, paddingHorizontal: 16, paddingVertical: 10, zIndex: 1000 },
});
