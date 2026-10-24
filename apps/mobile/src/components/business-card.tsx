import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { AVATARS } from '@/constants/avatars';
import type { EmojiName } from '@/constants/emoji';
import { Brand, Radius, Shadow } from '@/constants/theme';
import { ATTEND_LABEL, categoriesOf, categoryBySlug, categoryFor, distanceTo, initials, primaryAction, specialtiesIn, specialtyCategory, specialtyEmoji } from '@/data';
import type { Attend, Business } from '@/data/types';
import type { Source } from '@/data/stats';
import { markSource, track } from '@/lib/analytics';
import { distance, money } from '@/lib/format';
import { useApp } from '@/store/app';

import { Emoji } from './emoji';
import { Stars } from './ui';

export const ATTEND_EMOJI: Record<Attend, EmojiName> = { despacho: 'edificio', en_linea: 'laptop', domicilio: 'casa' };

/** Foto del experto; si no subió una, su cara ilustrada o sus iniciales. Lleva el dibujo de su oficio. */
export function ProAvatar({ business, size = 60, badge = true, categorySlug }: { business: Business; size?: number; badge?: boolean; categorySlug?: string }) {
  const cat = categoryBySlug(categorySlug ?? business.categorySlug);
  const bg = cat?.color === Brand.line ? Brand.inkSoft : cat?.color ?? Brand.chile;
  const art = AVATARS[business.slug];
  const r = size * 0.32;
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ width: size, height: size, borderRadius: r, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {business.photo ? (
          <Image source={{ uri: business.photo }} style={{ width: size, height: size }} contentFit="cover" accessibilityLabel={`Foto de ${business.name}`} />
        ) : art ? (
          <Image source={art} style={{ width: size, height: size }} contentFit="cover" accessibilityLabel={`Ilustración de ${business.name}`} />
        ) : (
          <Text style={{ color: cat?.ink === Brand.mango ? Brand.mango : Brand.white, fontWeight: '800', fontSize: size * 0.36 }}>{initials(business.name).toUpperCase()}</Text>
        )}
      </View>
      {badge && cat ? (
        <View style={[styles.badge, { width: size * 0.42, height: size * 0.42, borderRadius: size * 0.21, right: -size * 0.08, bottom: -size * 0.08 }]}>
          <Emoji name={cat.emoji} size={size * 0.26} />
        </View>
      ) : null}
    </View>
  );
}

export function consultLabel(b: Business): string | null {
  if (b.consultPrice === undefined) return null;
  const what = b.attends.includes('domicilio') && !b.attends.includes('despacho') ? 'Visita' : 'Consulta';
  return b.consultPrice === 0 ? `${what} gratis` : `${what} ${money(b.consultPrice)}`;
}

/** Tarjeta de un experto: se entiende por los dibujos y se actúa con dos botones grandes. */
export function BusinessCard({
  business,
  sponsored,
  source = 'otro',
  highlight,
  categorySlug,
}: {
  /** Categoría que se está viendo (en la pantalla de una categoría) */
  categorySlug?: string;
  business: Business;
  sponsored?: boolean;
  source?: Source;
  /** Especialidad que buscó el cliente, para mostrarla primero */
  highlight?: string;
}) {
  const router = useRouter();
  const { state } = useApp();
  // En cada mundo se muestra con la categoría y especialidades de ese mundo
  const cat = categoryFor(business, state.lookingFor, categorySlug);
  // Primero las especialidades de la categoría que se está viendo
  const own = [...specialtiesIn(business, cat?.group ?? state.lookingFor)].sort((x, y) => Number(specialtyCategory(y) === cat?.slug) - Number(specialtyCategory(x) === cat?.slug));
  const specs = highlight && own.includes(highlight) ? [highlight, ...own.filter((s) => s !== highlight)] : own;
  const others = categoriesOf(business).filter((s) => s !== cat?.slug).map((s) => categoryBySlug(s)?.name).filter(Boolean);
  const consult = consultLabel(business);
  const action = primaryAction(business);
  const go = () => {
    markSource(source);
    router.push(`/negocio/${business.slug}`);
  };

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${business.name}, ${business.profession}`} onPress={go} style={({ pressed }) => [styles.card, Shadow, pressed && { opacity: 0.9 }]}>
      {sponsored ? (
        <View style={styles.sponsor} accessibilityLabel="Destacado">
          <Emoji name="estrella" size={14} />
          <Text style={styles.sponsorText}>Destacado</Text>
        </View>
      ) : null}
      <View style={styles.row}>
        <ProAvatar business={business} size={72} categorySlug={cat?.slug} />
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={styles.name} numberOfLines={1}>
              {business.name}
            </Text>
            {business.verified ? <Emoji name="palomita" size={16} label="Verificado" /> : null}
          </View>
          <Text style={styles.sub} numberOfLines={1}>
            {cat && cat.slug !== business.categorySlug ? `${cat.name} · ${business.profession}` : business.profession}
            {business.yearsExp ? ` · ${business.yearsExp} años` : ''}
          </Text>
          {others.length ? (
            <Text style={styles.also} numberOfLines={1}>
              También: {others.join(', ')}
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            <Stars rating={business.rating} size={15} />
            <Text style={styles.rating}>{business.rating.toFixed(1)}</Text>
            <Text style={styles.meta}>({business.ratingCount})</Text>
          </View>
          <View style={styles.metaRow}>
            <Emoji name="pin" size={14} />
            <Text style={styles.meta}>{distance(distanceTo(business))}</Text>
            {business.attends.map((a) => (
              <Emoji key={a} name={ATTEND_EMOJI[a]} size={18} label={ATTEND_LABEL[a]} />
            ))}
          </View>
        </View>
      </View>

      {specs.length ? (
        <View style={styles.chips}>
          {specs.slice(0, 3).map((s) => {
            const on = s === highlight;
            return (
              <View key={s} style={[styles.spec, on && { backgroundColor: Brand.chile, borderColor: Brand.chile }]}>
                <Emoji name={specialtyEmoji(s)} size={16} />
                <Text style={[styles.specText, on && { color: Brand.white }]}>{s}</Text>
              </View>
            );
          })}
          {specs.length > 3 ? (
            <View style={styles.spec}>
              <Text style={styles.specText}>+{specs.length - 3}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {business.urgent24 || consult || business.promo ? (
        <View style={styles.chips}>
          {business.urgent24 ? <Tag emoji="sirena" text="Urgencias 24 h" bg="#FDE2E2" fg="#A32020" /> : null}
          {consult ? <Tag emoji="billete" text={consult} bg={Brand.nopalSoft} fg={Brand.nopalDark} /> : null}
          {business.promo ? <Tag emoji="etiqueta" text={business.promo} bg={Brand.mangoSoft} fg="#5A3E00" /> : null}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Escribir a ${business.name} por WhatsApp`}
          onPress={() => {
            track(business, 'contacto', { screen: 'whatsapp' });
            Linking.openURL(`https://wa.me/${business.phone}?text=${encodeURIComponent('Hola, te encontré en Expertalia 360')}`);
          }}
          style={({ pressed }) => [styles.actionBtn, { backgroundColor: '#25D366' }, pressed && { opacity: 0.85 }]}>
          <Emoji name="globo_texto" size={22} />
          <Text style={[styles.actionText, { color: Brand.white }]}>Mensaje</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            markSource(source);
            router.push(action.module === 'reservar' ? `/negocio/${business.slug}/reservar` : `/negocio/${business.slug}/cotizar`);
          }}
          style={({ pressed }) => [styles.actionBtn, { backgroundColor: Brand.chile, flex: 1.3 }, pressed && { opacity: 0.85 }]}>
          <Emoji name={action.module === 'reservar' ? 'calendario' : 'nota'} size={22} />
          <Text style={[styles.actionText, { color: Brand.white }]}>{action.module === 'reservar' ? 'Agendar' : 'Cotizar'}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

export function Tag({ emoji, text, bg, fg }: { emoji: EmojiName; text: string; bg: string; fg: string }) {
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      <Emoji name={emoji} size={16} />
      <Text style={[styles.tagText, { color: fg }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  also: { fontSize: 12, fontWeight: '700', color: '#8A6A12' },
  card: { backgroundColor: Brand.white, borderRadius: Radius.lg, padding: 14, gap: 10 },
  row: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  badge: { position: 'absolute', backgroundColor: Brand.white, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Brand.white, ...Shadow },
  sponsor: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Brand.mangoSoft, borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 3, marginBottom: -2 },
  sponsorText: { fontSize: 11, fontWeight: '800', color: '#5A3E00' },
  name: { fontSize: 17, fontWeight: '800', color: Brand.ink, flexShrink: 1 },
  sub: { fontSize: 13, color: Brand.inkSoft },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rating: { fontSize: 14, fontWeight: '800', color: Brand.ink },
  meta: { fontSize: 12, color: Brand.inkSoft },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  spec: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: Radius.pill, backgroundColor: Brand.chileSoft, borderWidth: 1, borderColor: Brand.chileSoft },
  specText: { fontSize: 12, fontWeight: '700', color: Brand.chileDark },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: Radius.pill, maxWidth: '100%' },
  tagText: { fontSize: 12, fontWeight: '800', flexShrink: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: Radius.md },
  actionText: { fontSize: 15, fontWeight: '800' },
});
