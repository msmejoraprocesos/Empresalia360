import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Ring } from '@/components/ring';
import { Button, Card, Header, OptionPill, SectionTitle } from '@/components/ui';
import { Brand, Radius, Shadow } from '@/constants/theme';
import { BUSINESSES, getBusiness, PROMOTIONS } from '@/data';
import { markSource } from '@/lib/analytics';
import { useApp } from '@/store/app';

const COLORS = [Brand.chile, Brand.alberca, Brand.nopal, Brand.jacaranda];
const COUPON_STYLE: Record<string, { bg: string; fg: string; tag: string }> = {
  vence: { bg: Brand.mangoSoft, fg: '#6B4A10', tag: 'VENCE HOY' },
  cumpleanos: { bg: Brand.chileSoft, fg: Brand.chileDark, tag: 'CUMPLEAÑOS' },
  global: { bg: Brand.nopalSoft, fg: Brand.nopalDark, tag: 'GLOBAL' },
  negocio: { bg: Brand.albercaSoft, fg: '#1757B8', tag: 'PARA TI' },
};

export default function Lealtad() {
  const router = useRouter();
  const { state } = useApp();
  const cards = BUSINESSES.filter((b) => b.loyalty && state.stamps[b.slug] !== undefined);
  const [sel, setSel] = useState(cards[0]?.slug);
  const b = getBusiness(sel);
  const idx = Math.max(0, cards.findIndex((c) => c.slug === sel));
  const goal = b?.loyalty?.goal ?? 10;
  const have = Math.min(goal, b ? state.stamps[b.slug] ?? 0 : 0);
  const left = goal - have;

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title="Lealtad y cupones" subtitle={`${state.points.toLocaleString('es-MX')} puntos Expertalia 360`} />
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 8 }}>
          {cards.map((c) => (
            <OptionPill key={c.slug} label={c.name} selected={c.slug === sel} onPress={() => setSel(c.slug)} />
          ))}
        </ScrollView>

        {b ? (
          <View style={{ alignItems: 'center', paddingHorizontal: 20 }}>
            <Ring progress={have / goal} color={COLORS[idx % COLORS.length]} size={240}>
              <Text style={styles.ringBig}>
                {have}
                <Text style={styles.ringGoal}>/{goal}</Text>
              </Text>
              <Text style={styles.ringUnit}>sellos</Text>
            </Ring>
            <Text style={styles.headline}>{left === 0 ? '¡Completaste tu tarjeta!' : left <= 2 ? `¡Te faltan ${left}!` : 'Vas muy bien'}</Text>
            <Text style={styles.reward}>Al completar: {b.loyalty?.reward}</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, alignSelf: 'stretch' }}>
              <Button label="Mostrar mi QR" style={{ flex: 1 }} onPress={() => router.push('/cliente/qr')} />
              <Button label="Ver negocio" variant="ghost" style={{ flex: 1 }} onPress={() => {
                markSource('favoritos');
                router.push(`/negocio/${b.slug}`);
              }}
            />
            </View>
          </View>
        ) : null}

        <View style={{ paddingHorizontal: 16 }}>
          <SectionTitle title="Cupones para ti" />
          <View style={{ gap: 10 }}>
            {PROMOTIONS.map((p) => {
              const st = COUPON_STYLE[p.kind];
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  onPress={() => p.businessSlug && router.push(`/negocio/${p.businessSlug}`)}
                  style={[styles.coupon, Shadow]}>
                  <View style={[styles.couponLeft, { backgroundColor: st.bg }]}>
                    <Text style={[styles.couponBadge, { color: st.fg }]}>{p.badge}</Text>
                    <Text style={[styles.couponTag, { color: st.fg }]}>{st.tag}</Text>
                  </View>
                  <View style={{ flex: 1, padding: 12 }}>
                    <Text style={styles.couponTitle}>{p.title}</Text>
                    <Text style={styles.couponSub}>{p.subtitle}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Card style={{ marginTop: 16, backgroundColor: Brand.ink }}>
            <Text style={{ color: Brand.mango, fontWeight: '800' }}>¿Cómo gano puntos?</Text>
            <Text style={{ color: '#E3E8EF', marginTop: 6, lineHeight: 20 }}>
              +20 por contratar o agendar, +50 por reseñar y +100 por recomendar a alguien. Solo da tu celular o muestra tu QR al pagar.
            </Text>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ringBig: { fontSize: 60, fontWeight: '800', color: Brand.ink },
  ringGoal: { fontSize: 26, color: Brand.inkSoft },
  ringUnit: { fontSize: 13, color: Brand.inkSoft },
  headline: { fontSize: 22, fontWeight: '800', color: Brand.ink, marginTop: 16 },
  reward: { fontSize: 14, color: Brand.inkSoft, marginTop: 4, textAlign: 'center' },
  coupon: { flexDirection: 'row', backgroundColor: Brand.white, borderRadius: Radius.lg, overflow: 'hidden' },
  couponLeft: { width: 90, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  couponBadge: { fontSize: 18, fontWeight: '800' },
  couponTag: { fontSize: 10, fontWeight: '800', marginTop: 2 },
  couponTitle: { fontSize: 14, fontWeight: '800', color: Brand.ink },
  couponSub: { fontSize: 12, color: Brand.inkSoft, marginTop: 2 },
});
