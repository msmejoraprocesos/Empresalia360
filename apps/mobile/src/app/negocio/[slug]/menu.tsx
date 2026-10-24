import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, Header, IconCircle, Segmented, Stepper } from '@/components/ui';
import { Brand, Radius, ShadowStrong } from '@/constants/theme';
import { categoryBySlug, getBusiness } from '@/data';
import type { OrderMode } from '@/data/types';
import { track, useBusinessScreen } from '@/lib/analytics';
import { money } from '@/lib/format';
import { useApp } from '@/store/app';

export default function Menu() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, actions } = useApp();
  const b = getBusiness(slug);
  const [section, setSection] = useState<string>('Todo');
  useBusinessScreen(b, 'menu', 'vista_catalogo');
  if (!b) return <EmptyState icon="storefront-outline" title="Negocio no encontrado" text="" />;

  const cat = categoryBySlug(b.categorySlug);
  const products = b.items.filter((i) => i.kind === 'producto');
  const sections = ['Todo', ...Array.from(new Set(products.map((p) => p.section).filter(Boolean) as string[]))];
  const shown = section === 'Todo' ? products : products.filter((p) => p.section === section);
  const lines = state.cart.businessSlug === b.slug ? state.cart.lines : {};
  const count = Object.values(lines).reduce((a, n) => a + n, 0);
  const total = Object.entries(lines).reduce((a, [id, n]) => a + (b.items.find((i) => i.id === id)?.price ?? 0) * n, 0);
  const otherCart = state.cart.businessSlug && state.cart.businessSlug !== b.slug ? getBusiness(state.cart.businessSlug) : undefined;

  const modes: { value: OrderMode; label: string }[] = [
    { value: 'para_llevar', label: 'En despacho' },
    ...(b.delivers ? [{ value: 'domicilio' as OrderMode, label: 'A domicilio' }] : []),
    { value: 'en_local', label: 'En línea' },
  ];
  const mode = modes.some((m) => m.value === state.cart.mode) ? state.cart.mode : 'para_llevar';

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title={b.name} subtitle={b.isOpen ? 'Abierto · responde en menos de 1 hora' : 'Fuera de horario: puedes contratar y te contactan mañana'}>
        <View style={{ marginTop: 14 }}>
          <Segmented dark value={mode} onChange={actions.setCartMode} options={modes} />
        </View>
      </Header>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 130 }}>
        {otherCart ? (
          <View style={[styles.notice, { backgroundColor: Brand.mangoSoft }]}>
            <Text style={{ color: '#5A3E00', fontSize: 13 }}>
              Tienes productos de {otherCart.name}. Si agregas de aquí, ese carrito se reemplaza.
            </Text>
          </View>
        ) : null}
        {b.promo ? (
          <View style={styles.notice}>
            <Text style={{ color: '#152A4D', fontSize: 13 }}>
              <Text style={{ fontWeight: '800' }}>Beneficio Expertalia 360: </Text>
              {b.promo}
            </Text>
          </View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 18, paddingVertical: 8 }}>
          {sections.map((s) => (
            <Pressable key={s} onPress={() => setSection(s)} accessibilityRole="tab" accessibilityState={{ selected: s === section }}>
              <Text style={[styles.sectionTab, s === section && styles.sectionTabOn]}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {shown.map((it) => {
          const qty = lines[it.id] ?? 0;
          return (
            <View key={it.id} style={styles.item}>
              {it.photo ? (
                <Image source={{ uri: it.photo }} style={styles.thumb} contentFit="cover" accessibilityLabel={it.name} />
              ) : (
                <IconCircle icon={cat?.icon ?? 'fast-food-outline'} color={Brand.chileSoft} ink={Brand.chileDark} size={64} square />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{it.name}</Text>
                {it.description ? <Text style={styles.itemDesc}>{it.description}</Text> : null}
                <Text style={styles.itemPrice}>{money(it.price ?? 0)}</Text>
              </View>
              {!it.available ? (
                <Text style={{ color: Brand.inkMuted, fontSize: 12, fontWeight: '700' }}>Agotado</Text>
              ) : qty === 0 ? (
                <Pressable
                  onPress={() => {
                    track(b, 'seleccion', { itemId: it.id });
                    actions.addToCart(b.slug, it.id, 1);
                  }} accessibilityLabel={`Agregar ${it.name}`} style={styles.add}>
                  <Ionicons name="add" size={22} color={Brand.chile} />
                </Pressable>
              ) : (
                <Stepper value={qty} onChange={(n) => actions.addToCart(b.slug, it.id, n - qty)} />
              )}
            </View>
          );
        })}
      </ScrollView>

      {count > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/pago?slug=${b.slug}`)}
          style={[styles.cartBar, ShadowStrong, { bottom: insets.bottom + 20 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={styles.cartCount}>
              <Text style={{ color: Brand.white, fontWeight: '800' }}>{count}</Text>
            </View>
            <Text style={styles.cartText}>Ver pedido</Text>
          </View>
          <Text style={styles.cartText}>{money(total)}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { padding: 12, borderRadius: Radius.md, backgroundColor: Brand.chileSoft, marginBottom: 10 },
  sectionTab: { fontSize: 15, color: Brand.inkSoft, paddingBottom: 6 },
  sectionTabOn: { color: Brand.ink, fontWeight: '800', borderBottomWidth: 3, borderBottomColor: Brand.chile },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Brand.line },
  itemName: { fontSize: 15, fontWeight: '700', color: Brand.ink },
  thumb: { width: 72, height: 72, borderRadius: 16, backgroundColor: Brand.line },
  itemDesc: { fontSize: 12, color: Brand.inkSoft, marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '800', color: Brand.ink, marginTop: 4 },
  add: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: Brand.line, backgroundColor: Brand.white, alignItems: 'center', justifyContent: 'center' },
  cartBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 58,
    borderRadius: 18,
    backgroundColor: Brand.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  cartCount: { minWidth: 28, height: 28, borderRadius: 14, backgroundColor: Brand.chile, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  cartText: { color: Brand.white, fontSize: 16, fontWeight: '800' },
});
