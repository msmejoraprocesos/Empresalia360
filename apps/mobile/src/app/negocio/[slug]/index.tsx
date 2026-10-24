import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomBar, Button, Card, Chip, EmptyState, IconCircle, RoundIconButton, Segmented, Stars } from '@/components/ui';
import { Brand, Radius, ShadowStrong } from '@/constants/theme';
import { categoryBySlug, distanceTo, getBusiness, primaryAction } from '@/data';
import { markSource, track, useBusinessScreen } from '@/lib/analytics';
import { distance, money } from '@/lib/format';
import { useApp } from '@/store/app';

type Tab = 'servicios' | 'resenas' | 'info';

export default function PerfilNegocio() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, actions } = useApp();
  const [tab, setTab] = useState<Tab>('servicios');
  const b = getBusiness(slug);
  useBusinessScreen(b, 'perfil', 'vista_perfil');
  if (!b) return <EmptyState icon="storefront-outline" title="Negocio no encontrado" text="Puede que ya no esté en Expertalia 360." />;

  const cat = categoryBySlug(b.categorySlug);
  const fav = state.favorites.includes(b.slug);
  const action = primaryAction(b);
  const reviews = [...(state.userReviews[b.slug] ?? []), ...b.reviews];
  const isPro = true;
  const goPrimary = () =>
    router.push(action.module === 'ordenar' ? `/negocio/${b.slug}/menu` : action.module === 'reservar' ? `/negocio/${b.slug}/reservar` : `/negocio/${b.slug}/cotizar`);

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
        <View style={[styles.cover, { backgroundColor: cat?.color === Brand.line ? Brand.inkSoft : cat?.color ?? Brand.chile, paddingTop: insets.top + 10 }]}>
          <View style={styles.coverRow}>
            <RoundIconButton icon="chevron-back" label="Volver" onPress={() => router.back()} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <RoundIconButton
                icon="share-social-outline"
                label="Compartir"
                onPress={() => {
                  track(b, 'compartir');
                  markSource('mini_sitio');
                  router.push(`/n/${b.slug}`);
                }}
              />
              <RoundIconButton
                icon={fav ? 'heart' : 'heart-outline'}
                label={fav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                color={fav ? Brand.bugambilia : Brand.ink}
                onPress={() => {
                  if (!fav) track(b, 'favorito');
                  actions.toggleFavorite(b.slug);
                }}
              />
            </View>
          </View>
          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <Ionicons name={cat?.icon ?? 'storefront-outline'} size={64} color="rgba(255,255,255,0.85)" />
          </View>
        </View>

        <Card strong style={styles.info}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.name}>{b.name}</Text>
            {b.verified ? <Ionicons name="checkmark-circle" size={20} color={Brand.nopal} accessibilityLabel="Verificado" /> : null}
          </View>
          <Text style={styles.sub}>
            {b.subtitle} · {b.zone} · {distance(distanceTo(b))}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="star" size={16} color="#C98A0B" />
              <Text style={{ fontWeight: '800', color: Brand.ink }}>{b.rating.toFixed(1)}</Text>
              <Text style={styles.sub}>({b.ratingCount})</Text>
            </View>
            <Text style={{ color: b.isOpen ? Brand.nopalDark : Brand.inkMuted, fontWeight: '700' }}>
              {b.isOpen ? `Abierto · cierra ${b.closesAt}` : 'Cerrado ahora'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
            {b.verified ? <Chip label={isPro ? 'Cédula verificada' : 'Negocio verificado'} color={Brand.nopalSoft} ink={Brand.nopalDark} icon="checkmark" /> : null}
            {b.delivers ? <Chip label="Visita a domicilio" /> : null}
            {b.modules.includes('consulta') ? <Chip label="Consulta en línea" /> : null}
            {b.loyalty ? <Chip label={`Lealtad: ${b.loyalty.reward}`} color={Brand.mangoSoft} ink="#5A3E00" icon="gift-outline" /> : null}
          </View>
        </Card>

        {b.promo ? (
          <View style={styles.promo}>
            <Ionicons name="pricetag" size={20} color={Brand.chileDark} />
            <Text style={styles.promoText}>
              <Text style={{ fontWeight: '800' }}>Beneficio Expertalia 360: </Text>
              {b.promo}
            </Text>
          </View>
        ) : null}

        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <Segmented
            value={tab}
            onChange={(t) => {
              setTab(t);
              if (t !== 'info') track(b, t === 'resenas' ? 'vista_resenas' : 'vista_catalogo');
            }}
            options={[
              { value: 'servicios', label: 'Servicios' },
              { value: 'resenas', label: `Reseñas (${reviews.length})` },
              { value: 'info', label: 'Info' },
            ]}
          />
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          {tab === 'servicios' ? (
            <Card style={{ paddingVertical: 4 }}>
              {b.items.map((it, i) => (
                <View key={it.id} style={[styles.item, i < b.items.length - 1 && styles.divider]}>
                  {it.photo ? <Image source={{ uri: it.photo }} style={styles.thumb} contentFit="cover" accessibilityLabel={it.name} /> : null}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{it.name}</Text>
                    <Text style={styles.sub}>
                      {it.kind === 'cita' && it.durationMin ? `${it.durationMin} min` : it.description ?? (it.kind === 'cotizacion' ? 'Precio según el caso' : '')}
                    </Text>
                  </View>
                  {it.kind === 'cotizacion' ? (
                    <Pressable onPress={() => router.push(`/negocio/${b.slug}/cotizar?item=${it.id}`)} accessibilityRole="button">
                      <Text style={{ color: Brand.jacaranda, fontWeight: '800' }}>Cotizar</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.price}>{money(it.price ?? 0)}</Text>
                  )}
                </View>
              ))}
            </Card>
          ) : null}

          {tab === 'resenas' ? (
            <View style={{ gap: 10 }}>
              <Button label="Ver todas y escribir reseña" variant="ghost" icon="star-outline" onPress={() => router.push(`/negocio/${b.slug}/resenas`)} />
              {reviews.slice(0, 3).map((r) => (
                <Card key={r.id}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.itemName}>{r.author}</Text>
                      <Stars rating={r.rating} size={12} />
                    </View>
                    {r.verified ? <Chip label="Visita verificada" color={Brand.nopalSoft} ink={Brand.nopalDark} /> : null}
                  </View>
                  <Text style={[styles.sub, { color: Brand.ink, marginTop: 6, fontSize: 14 }]}>{r.body}</Text>
                </Card>
              ))}
            </View>
          ) : null}

          {tab === 'info' ? (
            <Card style={{ gap: 14 }}>
              <Text style={{ color: Brand.ink, fontSize: 15, lineHeight: 21 }}>{b.description}</Text>
              <View style={styles.infoRow}>
                <IconCircle icon="location-outline" color={Brand.line} ink={Brand.ink} size={36} square />
                <Text style={styles.infoText}>{b.address}, {b.zone}</Text>
              </View>
              <View style={styles.infoRow}>
                <IconCircle icon="time-outline" color={Brand.line} ink={Brand.ink} size={36} square />
                <Text style={styles.infoText}>Hoy cierra a las {b.closesAt}</Text>
              </View>
              <Button
                label="Cómo llegar"
                variant="ghost"
                icon="navigate-outline"
                onPress={() => {
                  track(b, 'como_llegar');
                  router.push('/mapa');
                }}
              />
            </Card>
          ) : null}
        </View>
      </ScrollView>

      <BottomBar>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <RoundIconButton
            icon="logo-whatsapp"
            label="Escribir por WhatsApp"
            size={54}
            bg={Brand.nopalSoft}
            color={Brand.nopalDark}
            onPress={() => {
              track(b, 'contacto', { screen: 'whatsapp' });
              Linking.openURL(`https://wa.me/${b.phone}?text=${encodeURIComponent('Hola, te encontré en Expertalia 360')}`);
            }}
          />
          <Button label={action.label} style={{ flex: 1 }} onPress={goPrimary} disabled={!b.isOpen && action.module === 'ordenar'} />
        </View>
        {b.modules.includes('cotizar') && action.module !== 'cotizar' ? (
          <Button label="Pedir cotización" variant="outline" small onPress={() => router.push(`/negocio/${b.slug}/cotizar`)} />
        ) : null}
      </BottomBar>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { height: 210, paddingHorizontal: 16 },
  coverRow: { flexDirection: 'row', justifyContent: 'space-between' },
  info: { marginHorizontal: 16, marginTop: -40, borderRadius: Radius.lg, ...ShadowStrong },
  name: { fontSize: 24, fontWeight: '800', color: Brand.ink, letterSpacing: -0.3, flexShrink: 1 },
  sub: { fontSize: 13, color: Brand.inkSoft, marginTop: 3 },
  promo: { flexDirection: 'row', gap: 10, alignItems: 'center', margin: 16, marginBottom: 0, padding: 12, borderRadius: Radius.md, backgroundColor: Brand.chileSoft },
  promoText: { flex: 1, color: '#152A4D', fontSize: 13 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: Brand.line },
  itemName: { fontSize: 15, fontWeight: '700', color: Brand.ink },
  thumb: { width: 56, height: 56, borderRadius: 14, backgroundColor: Brand.line },
  price: { fontSize: 15, fontWeight: '800', color: Brand.ink },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoText: { flex: 1, color: Brand.ink, fontSize: 14 },
});
