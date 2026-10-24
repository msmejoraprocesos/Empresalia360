import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, AppState, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/theme';
import { categoryBySlug, getBusiness } from '@/data';
import { OPENING_AD, OPENING_ADS, type OpeningAd } from '@/data/ads';
import type { Business } from '@/data/types';
import { markSource, track } from '@/lib/analytics';
import { markAdSeen, pickOpeningAd } from '@/lib/opening-ad';

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((w) => w.length > 2 || /^[A-ZÁÉÍÓÚ]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

/**
 * La historia a pantalla completa. Se usa en la app (con barra de avance) y como
 * vista previa en "Espacios preferenciales" (compact).
 */
export function AdStory({
  ad,
  business,
  progress,
  onCta,
  onClose,
  compact,
  topInset = 0,
  bottomInset = 0,
}: {
  ad: Pick<OpeningAd, 'headline' | 'body' | 'cta' | 'color' | 'photo'>;
  business: Business;
  progress?: Animated.Value;
  onCta?: () => void;
  onClose?: () => void;
  compact?: boolean;
  topInset?: number;
  bottomInset?: number;
}) {
  const cat = categoryBySlug(business.categorySlug);
  const k = compact ? 0.52 : 1;
  return (
    <View style={[styles.story, { backgroundColor: ad.color, paddingTop: topInset + 12 * k, paddingBottom: bottomInset + 20 * k, paddingHorizontal: 20 * k }]}>
      <View style={[styles.blob, { width: 360 * k, height: 360 * k, borderRadius: 180 * k, top: -90 * k, right: -120 * k }]} />
      <View style={[styles.blob, { width: 260 * k, height: 260 * k, borderRadius: 130 * k, bottom: 80 * k, left: -110 * k }]} />

      <View style={[styles.track, { height: 3 * k }]}>
        {progress ? (
          <Animated.View style={[styles.fill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        ) : (
          <View style={[styles.fill, { width: '40%' }]} />
        )}
      </View>

      <View style={[styles.top, { marginTop: 12 * k }]}>
        <View style={[styles.miniLogo, { width: 40 * k, height: 40 * k, borderRadius: 20 * k }]}>
          <Text style={{ color: ad.color, fontWeight: '800', fontSize: 15 * k }}>{initials(business.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.bizName, { fontSize: 15 * k }]} numberOfLines={1}>
            {business.name}
          </Text>
          <Text style={[styles.sponsored, { fontSize: 12 * k }]}>Patrocinado</Text>
        </View>
        {onClose ? (
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar anuncio" hitSlop={12} style={styles.close}>
            <Ionicons name="close" size={26} color={Brand.white} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.center}>
        {ad.photo ? (
          <Image
            source={{ uri: ad.photo }}
            style={{ width: '100%', aspectRatio: 1, maxHeight: 340 * k, borderRadius: 24 * k, borderWidth: 4 * k, borderColor: Brand.white }}
            contentFit="cover"
            accessibilityLabel={ad.headline}
          />
        ) : (
          <View style={[styles.logo, { width: 132 * k, height: 132 * k, borderRadius: 66 * k }]}>
            <Text style={{ color: ad.color, fontWeight: '800', fontSize: 46 * k, letterSpacing: -1 }}>{initials(business.name)}</Text>
            <View style={[styles.catBadge, { width: 40 * k, height: 40 * k, borderRadius: 20 * k, backgroundColor: Brand.ink }]}>
              <Ionicons name={cat?.icon ?? 'storefront-outline'} size={20 * k} color={Brand.white} />
            </View>
          </View>
        )}
        <Text style={[styles.headline, { fontSize: (ad.photo ? 30 : 36) * k, lineHeight: (ad.photo ? 34 : 40) * k, marginTop: (ad.photo ? 18 : 26) * k }]}>
          {ad.headline || 'Tu promoción'}
        </Text>
        {ad.body ? <Text style={[styles.body, { fontSize: 17 * k, lineHeight: 23 * k, marginTop: 10 * k }]}>{ad.body}</Text> : null}
        <View style={[styles.meta, { marginTop: 14 * k, paddingHorizontal: 12 * k, paddingVertical: 6 * k }]}>
          <Ionicons name="star" size={13 * k} color={Brand.mango} />
          <Text style={[styles.metaText, { fontSize: 13 * k }]}>
            {business.rating.toFixed(1)} · {business.zone}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={onCta}
        disabled={!onCta}
        accessibilityRole="button"
        style={({ pressed }) => [styles.cta, { height: 56 * k, borderRadius: 18 * k }, pressed && { opacity: 0.85 }]}>
        <Text style={{ color: ad.color, fontWeight: '800', fontSize: 17 * k }}>{ad.cta || 'Ver promoción'}</Text>
        <Ionicons name="arrow-forward" size={18 * k} color={ad.color} />
      </Pressable>
    </View>
  );
}

/**
 * Muestra el anuncio al abrir la app (al entrar y al volver después de 30 min).
 * Va dentro del layout del vecino.
 */
export function OpeningAdHost() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [ad, setAd] = useState<OpeningAd>();
  const [progress] = useState(() => new Animated.Value(0));
  const business = ad ? getBusiness(ad.businessSlug) : undefined;

  useEffect(() => {
    const tryShow = () => {
      const next = pickOpeningAd(OPENING_ADS);
      if (next) {
        markAdSeen(next.id);
        setAd(next);
      }
    };
    const timer = setTimeout(tryShow, 600);
    let leftAt = 0;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') leftAt = Date.now();
      if (s === 'active' && leftAt && Date.now() - leftAt > 30 * 60 * 1000) tryShow();
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (!ad || !business) return;
    track(business, 'anuncio_visto');
    progress.setValue(0);
    const anim = Animated.timing(progress, { toValue: 1, duration: OPENING_AD.seconds * 1000, easing: Easing.linear, useNativeDriver: false });
    anim.start(({ finished }) => finished && setAd(undefined));
    return () => anim.stop();
  }, [ad, business, progress]);

  if (!ad || !business) return null;
  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={() => setAd(undefined)}>
      <AdStory
        ad={ad}
        business={business}
        progress={progress}
        topInset={insets.top}
        bottomInset={insets.bottom}
        onClose={() => setAd(undefined)}
        onCta={() => {
          track(business, 'anuncio_toque');
          markSource('anuncio');
          setAd(undefined);
          router.push(`/negocio/${business.slug}`);
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  story: { flex: 1, overflow: 'hidden' },
  blob: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.12)' },
  track: { borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: Brand.white },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  miniLogo: { backgroundColor: Brand.white, alignItems: 'center', justifyContent: 'center' },
  bizName: { color: Brand.white, fontWeight: '800' },
  sponsored: { color: 'rgba(255,255,255,0.85)' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { backgroundColor: Brand.white, alignItems: 'center', justifyContent: 'center' },
  catBadge: { position: 'absolute', right: -4, bottom: -4, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: Brand.white },
  headline: { color: Brand.white, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5 },
  body: { color: 'rgba(255,255,255,0.92)', textAlign: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.18)' },
  metaText: { color: Brand.white, fontWeight: '700' },
  cta: { backgroundColor: Brand.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
