import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { consultLabel, ProAvatar } from '@/components/business-card';
import { BusinessMap } from '@/components/business-map';
import { PostCard } from '@/components/community-feed';
import { Pattern } from '@/components/pattern-background';
import { BottomBar, Button, Card, Chip, EmptyState, IconCircle, RoundIconButton, Segmented, Stars } from '@/components/ui';
import { Brand, Radius, ShadowStrong } from '@/constants/theme';
import { ATTEND_ICON, ATTEND_LABEL, categoryBySlug, distanceTo, getBusiness, primaryAction } from '@/data';
import { markSource, track, useBusinessScreen } from '@/lib/analytics';
import { distance, money } from '@/lib/format';
import { useApp } from '@/store/app';

type Tab = 'perfil' | 'servicios' | 'resenas' | 'publicaciones';

export default function PerfilProfesional() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, actions } = useApp();
  const [tab, setTab] = useState<Tab>('perfil');
  const b = getBusiness(slug);
  useBusinessScreen(b, 'perfil', 'vista_perfil');
  if (!b) return <EmptyState icon="person-outline" title="Perfil no encontrado" text="Puede que ya no esté en Expertalia 360." />;

  const cat = categoryBySlug(b.categorySlug);
  const fav = state.favorites.includes(b.slug);
  const action = primaryAction(b);
  const reviews = [...(state.userReviews[b.slug] ?? []), ...b.reviews];
  const posts = state.posts.filter((p) => p.businessSlug === b.slug);
  const consult = consultLabel(b);
  const coverColor = cat?.color === Brand.line || cat?.color === Brand.mango ? Brand.chile : cat?.color ?? Brand.chile;
  const dist = [5, 4, 3, 2, 1].map((n) => reviews.filter((r) => r.rating === n).length);
  const goPrimary = () => router.push(action.module === 'reservar' ? `/negocio/${b.slug}/reservar` : `/negocio/${b.slug}/cotizar`);
  void state.profileVersion;

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Pattern kind={cat?.group ?? 'profesionales'} />
      <ScrollView contentContainerStyle={{ paddingBottom: 150 }}>
        <View style={[styles.cover, { backgroundColor: coverColor, paddingTop: insets.top + 10 }]}>
          {b.cover ? <Image source={{ uri: b.cover }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel="Portada" /> : null}
          <View style={styles.coverRow}>
            <RoundIconButton icon="chevron-back" label="Volver" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <RoundIconButton
                icon="share-social-outline"
                label="Compartir perfil"
                onPress={() => {
                  track(b, 'compartir');
                  markSource('mini_sitio');
                  router.push(`/n/${b.slug}`);
                }}
              />
              <RoundIconButton
                icon={fav ? 'heart' : 'heart-outline'}
                label={fav ? 'Quitar de guardados' : 'Guardar'}
                color={fav ? Brand.bugambilia : Brand.ink}
                onPress={() => {
                  if (!fav) track(b, 'favorito');
                  actions.toggleFavorite(b.slug);
                }}
              />
            </View>
          </View>
        </View>

        <Card strong style={styles.info}>
          <View style={styles.idRow}>
            <ProAvatar business={b} size={72} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name}>{b.name}</Text>
              <Text style={styles.sub}>
                {b.profession} · {b.zone}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <Stars rating={b.rating} size={14} />
                <Text style={{ fontWeight: '800', color: Brand.ink }}>{b.rating.toFixed(1)}</Text>
                <Text style={styles.sub}>({b.ratingCount})</Text>
              </View>
            </View>
          </View>

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{b.yearsExp}</Text>
              <Text style={styles.statLabel}>años de experiencia</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{b.ratingCount}</Text>
              <Text style={styles.statLabel}>clientes opinan</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{distance(distanceTo(b))}</Text>
              <Text style={styles.statLabel}>de ti</Text>
            </View>
          </View>

          <View style={styles.chips}>
            {b.specialties.map((s) => (
              <Chip key={s} label={s} color={Brand.chileSoft} ink={Brand.chileDark} />
            ))}
          </View>

          <View style={styles.attends}>
            {b.attends.map((a) => (
              <View key={a} style={styles.attend}>
                <Ionicons name={ATTEND_ICON[a]} size={16} color={Brand.chile} />
                <Text style={styles.attendText}>{ATTEND_LABEL[a]}</Text>
              </View>
            ))}
          </View>

          {b.verified || b.responseTime || consult || b.urgent24 || b.warranty || b.loyalty ? (
            <View style={styles.trust}>
              {b.verified ? <Chip label={b.license ? 'Cédula verificada' : 'Identidad verificada'} color={Brand.nopalSoft} ink={Brand.nopalDark} icon="shield-checkmark" /> : null}
              {b.responseTime ? <Chip label={b.responseTime} icon="time-outline" /> : null}
              {consult ? <Chip label={consult} color={Brand.mangoSoft} ink="#5A3E00" icon="cash-outline" /> : null}
              {b.urgent24 ? <Chip label="Urgencias 24 h" color="#FDE2E2" ink="#A32020" icon="flash" /> : null}
              {b.warranty ? <Chip label={b.warranty} color={Brand.albercaSoft} ink="#1757B8" icon="shield-outline" /> : null}
              {b.loyalty ? <Chip label={`Lealtad: ${b.loyalty.reward}`} color={Brand.jacarandaSoft} ink={Brand.jacaranda} icon="gift-outline" /> : null}
            </View>
          ) : null}
        </Card>

        {b.promo ? (
          <View style={styles.promo}>
            <Ionicons name="sparkles" size={18} color={Brand.chileDark} />
            <Text style={styles.promoText}>{b.promo}</Text>
          </View>
        ) : null}

        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <Segmented
            value={tab}
            onChange={(t) => {
              setTab(t);
              if (t === 'resenas') track(b, 'vista_resenas');
              if (t === 'servicios') track(b, 'vista_catalogo');
            }}
            options={[
              { value: 'perfil', label: 'Perfil' },
              { value: 'servicios', label: 'Servicios' },
              { value: 'resenas', label: `Reseñas` },
              { value: 'publicaciones', label: 'Muro' },
            ]}
          />
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 12, gap: 10 }}>
          {tab === 'perfil' ? (
            <Card style={{ gap: 14 }}>
              <Text style={styles.h}>Sobre mí</Text>
              <Text style={styles.body}>{b.description}</Text>
              {b.license ? <InfoRow icon="ribbon-outline" label="Cédula o certificación" value={b.license} /> : null}
              {b.education ? <InfoRow icon="school-outline" label="Formación" value={b.education} /> : null}
              <InfoRow icon="language-outline" label="Idiomas" value={b.languages.join(', ')} />
              <InfoRow icon="time-outline" label="Horario de hoy" value={b.isOpen ? `Disponible hasta las ${b.closesAt}` : 'Fuera de horario'} />
            </Card>
          ) : null}

          {tab === 'perfil' && b.gallery?.length ? (
            <Card style={{ gap: 10 }}>
              <Text style={styles.h}>{b.attends.includes('domicilio') && !b.attends.includes('despacho') ? 'Trabajos realizados' : 'Fotos'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {b.gallery.map((g) => (
                  <View key={g.id} style={{ width: 170, gap: 6 }}>
                    {g.uri ? (
                      <Image source={{ uri: g.uri }} style={styles.galleryImg} contentFit="cover" accessibilityLabel={g.caption} />
                    ) : (
                      <View style={[styles.galleryImg, { backgroundColor: g.color ?? Brand.line, alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="image-outline" size={28} color="rgba(18,26,43,0.35)" />
                      </View>
                    )}
                    <Text style={styles.galleryCaption} numberOfLines={2}>
                      {g.caption}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </Card>
          ) : null}

          {tab === 'perfil' ? (
            <Card style={{ gap: 12 }}>
              <Text style={styles.h}>Ubicación</Text>
              <View style={styles.miniMap}>
                <BusinessMap businesses={[b]} selected={b.slug} onSelect={() => undefined} still focus />
              </View>
              <InfoRow icon="location-outline" label="Dirección" value={`${b.address}, ${b.zone}`} />
              {b.references ? <InfoRow icon="navigate-outline" label="Referencias para llegar" value={b.references} /> : null}
              <InfoRow icon="walk-outline" label="Distancia" value={`${distance(distanceTo(b))} de ti`} />
              <Button
                label="Abrir en el mapa"
                variant="ghost"
                icon="map-outline"
                small
                onPress={() => {
                  track(b, 'como_llegar');
                  router.push(`/mapa?slug=${b.slug}`);
                }}
              />
            </Card>
          ) : null}

          {tab === 'servicios' && b.items.some((i) => i.kind === 'producto') ? (
            <Pressable onPress={() => router.push(`/negocio/${b.slug}/contratar`)} accessibilityRole="button" style={styles.packages}>
              <Ionicons name="card-outline" size={22} color={Brand.white} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: Brand.white, fontWeight: '800', fontSize: 15 }}>Paquetes con precio fijo</Text>
                <Text style={{ color: '#D6E0F0', fontSize: 12 }}>Contrata y paga en la app con tarjeta, transferencia o efectivo</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Brand.white} />
            </Pressable>
          ) : null}

          {tab === 'servicios' ? (
            <Card style={{ paddingVertical: 4 }}>
              {b.items.map((it, i) => (
                <View key={it.id} style={[styles.item, i < b.items.length - 1 && styles.divider]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{it.name}</Text>
                    <Text style={styles.sub}>
                      {[it.kind === 'cita' && it.durationMin ? `${it.durationMin} min` : null, it.description].filter(Boolean).join(' · ') || 'Precio según el caso'}
                    </Text>
                  </View>
                  {it.kind === 'producto' ? (
                    <Pressable onPress={() => router.push(`/negocio/${b.slug}/contratar`)} accessibilityRole="button" hitSlop={8} style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.price}>{money(it.price ?? 0)}</Text>
                      <Text style={{ color: Brand.nopalDark, fontWeight: '800', fontSize: 12 }}>Contratar</Text>
                    </Pressable>
                  ) : it.kind === 'cotizacion' ? (
                    <Pressable onPress={() => router.push(`/negocio/${b.slug}/cotizar?item=${it.id}`)} accessibilityRole="button" hitSlop={8}>
                      <Text style={{ color: Brand.jacaranda, fontWeight: '800' }}>Cotizar</Text>
                    </Pressable>
                  ) : (
                    <Pressable onPress={() => router.push(`/negocio/${b.slug}/reservar`)} accessibilityRole="button" hitSlop={8} style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.price}>{it.price ? money(it.price) : 'Sin costo'}</Text>
                      <Text style={{ color: Brand.chile, fontWeight: '800', fontSize: 12 }}>Agendar</Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </Card>
          ) : null}

          {tab === 'resenas' ? (
            <>
              <Card style={styles.summary}>
                <View style={{ alignItems: 'center', minWidth: 90 }}>
                  <Text style={styles.bigRating}>{b.rating.toFixed(1)}</Text>
                  <Stars rating={b.rating} size={14} />
                  <Text style={styles.sub}>{b.ratingCount} reseñas</Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  {dist.map((count, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.distLabel}>{5 - i}</Text>
                      <View style={styles.distTrack}>
                        <View style={[styles.distFill, { width: `${reviews.length ? (count / reviews.length) * 100 : 0}%` }]} />
                      </View>
                    </View>
                  ))}
                </View>
              </Card>
              <Button label="Escribir una reseña" variant="ghost" icon="create-outline" onPress={() => router.push(`/negocio/${b.slug}/resenas`)} />
              {reviews.map((r) => (
                <Card key={r.id} style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
                      <Text style={styles.itemName}>{r.author}</Text>
                      <Stars rating={r.rating} size={12} />
                    </View>
                    <Text style={styles.sub}>{r.dateLabel}</Text>
                  </View>
                  {r.verified ? <Chip label="Cliente atendido" color={Brand.nopalSoft} ink={Brand.nopalDark} icon="checkmark" /> : null}
                  <Text style={[styles.body, { fontSize: 14 }]}>{r.body}</Text>
                  {r.reply || state.replies[r.id] ? (
                    <View style={styles.reply}>
                      <Text style={styles.replyLabel}>Respuesta de {b.name}</Text>
                      <Text style={styles.body}>{state.replies[r.id] ?? r.reply}</Text>
                    </View>
                  ) : null}
                </Card>
              ))}
            </>
          ) : null}

          {tab === 'publicaciones' ? (
            posts.length ? (
              posts.map((p) => <PostCard key={p.id} post={p} />)
            ) : (
              <EmptyState icon="megaphone-outline" title="Sin publicaciones" text="Aquí aparecen los servicios, consejos y eventos que publica en la comunidad." />
            )
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
              Linking.openURL(`https://wa.me/${b.phone}?text=${encodeURIComponent('Hola, vi tu perfil en Expertalia 360')}`);
            }}
          />
          <Button label={action.label} style={{ flex: 1 }} onPress={goPrimary} />
        </View>
        {b.modules.includes('cotizar') && action.module !== 'cotizar' ? (
          <Button label="Pedir cotización" variant="outline" small onPress={() => router.push(`/negocio/${b.slug}/cotizar`)} />
        ) : null}
      </BottomBar>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: 'ribbon-outline' | 'school-outline' | 'language-outline' | 'location-outline' | 'time-outline' | 'navigate-outline' | 'walk-outline'; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <IconCircle icon={icon} color={Brand.chileSoft} ink={Brand.chile} size={36} square />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoText}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { height: 150, paddingHorizontal: 16, overflow: 'hidden' },
  coverRow: { flexDirection: 'row', justifyContent: 'space-between' },
  info: { marginHorizontal: 16, marginTop: -54, borderRadius: Radius.lg, gap: 14, ...ShadowStrong },
  idRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  name: { fontSize: 22, fontWeight: '800', color: Brand.ink, letterSpacing: -0.3 },
  sub: { fontSize: 13, color: Brand.inkSoft, marginTop: 2 },
  stats: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: Brand.line, paddingVertical: 10 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: Brand.ink },
  statLabel: { fontSize: 11, color: Brand.inkSoft, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  attends: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  attend: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  attendText: { fontSize: 13, fontWeight: '700', color: Brand.ink },
  trust: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  promo: { flexDirection: 'row', gap: 10, alignItems: 'center', margin: 16, marginBottom: 0, padding: 12, borderRadius: Radius.md, backgroundColor: Brand.chileSoft },
  promoText: { flex: 1, color: Brand.chileDark, fontSize: 13, fontWeight: '700' },
  h: { fontSize: 16, fontWeight: '800', color: Brand.ink },
  body: { color: Brand.ink, fontSize: 15, lineHeight: 21 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: Brand.line },
  itemName: { fontSize: 15, fontWeight: '700', color: Brand.ink },
  price: { fontSize: 15, fontWeight: '800', color: Brand.ink },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoLabel: { fontSize: 11, fontWeight: '700', color: Brand.inkSoft, textTransform: 'uppercase', letterSpacing: 0.3 },
  infoText: { color: Brand.ink, fontSize: 14, marginTop: 1 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  bigRating: { fontSize: 36, fontWeight: '800', color: Brand.ink },
  distLabel: { width: 10, fontSize: 12, color: Brand.inkSoft, fontVariant: ['tabular-nums'] },
  distTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: Brand.line, overflow: 'hidden' },
  distFill: { height: 8, borderRadius: 4, backgroundColor: '#C98A0B' },
  galleryImg: { width: 170, height: 120, borderRadius: Radius.md },
  galleryCaption: { fontSize: 12, color: Brand.inkSoft },
  miniMap: { height: 170, borderRadius: Radius.md, overflow: 'hidden' },
  packages: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Brand.nopalDark, borderRadius: Radius.lg, padding: 14 },
  reply: { backgroundColor: Brand.tortilla, borderRadius: Radius.md, padding: 10, gap: 4, marginTop: 4 },
  replyLabel: { fontSize: 12, fontWeight: '800', color: Brand.chileDark },
});
