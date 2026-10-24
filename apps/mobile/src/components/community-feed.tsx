import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Brand, Radius, Shadow } from '@/constants/theme';
import { getBusiness } from '@/data';
import type { Post } from '@/data/types';
import { markSource } from '@/lib/analytics';
import { money } from '@/lib/format';
import { useApp } from '@/store/app';

import { ProAvatar, Tag } from './business-card';
import { Emoji } from './emoji';
import { Chip } from './ui';

const KIND: Record<Post['kind'], { label: string; icon: 'megaphone-outline' | 'bulb-outline' | 'calendar-outline'; bg: string; fg: string }> = {
  servicio: { label: 'Servicio', icon: 'megaphone-outline', bg: Brand.chileSoft, fg: Brand.chileDark },
  consejo: { label: 'Consejo', icon: 'bulb-outline', bg: Brand.mangoSoft, fg: '#5A3E00' },
  evento: { label: 'Evento', icon: 'calendar-outline', bg: Brand.nopalSoft, fg: Brand.nopalDark },
};

export type FeedFilter = 'todos' | Post['kind'];

export function FeedFilters({ value, onChange }: { value: FeedFilter; onChange: (f: FeedFilter) => void }) {
  const opts: { v: FeedFilter; label: string }[] = [
    { v: 'todos', label: 'Todo' },
    { v: 'servicio', label: 'Servicios' },
    { v: 'consejo', label: 'Consejos' },
    { v: 'evento', label: 'Eventos' },
  ];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
      {opts.map((o) => {
        const on = o.v === value;
        return (
          <Pressable
            key={o.v}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.v)}
            style={[styles.filter, on && { backgroundColor: Brand.ink, borderColor: Brand.ink }]}>
            <Text style={[styles.filterText, on && { color: Brand.white }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function PostCard({ post, compact }: { post: Post; compact?: boolean }) {
  const router = useRouter();
  const { state, actions } = useApp();
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState('');
  const b = getBusiness(post.businessSlug);
  if (!b) return null;
  const k = KIND[post.kind];
  const liked = state.likedPosts.includes(post.id);
  const author = state.role === 'negocio' ? b.name : `${state.userName} G.`;

  return (
    <View style={[styles.card, Shadow]}>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          markSource('otro');
          router.push(`/negocio/${b.slug}`);
        }}
        style={styles.head}>
        <ProAvatar business={b} size={42} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.author} numberOfLines={1}>
            {b.name}
          </Text>
          <Text style={styles.muted} numberOfLines={1}>
            {b.profession} · ★ {b.rating.toFixed(1)} · {post.dateLabel}
          </Text>
        </View>
        <Tag emoji={post.kind === 'servicio' ? 'megafono' : post.kind === 'consejo' ? 'foco' : 'fiesta'} text={k.label} bg={k.bg} fg={k.fg} />
      </Pressable>

      <Text style={styles.title}>{post.title}</Text>
      <Text style={styles.body} numberOfLines={compact ? 3 : undefined}>
        {post.body}
      </Text>

      {post.price !== undefined || post.priceNote || post.specialty ? (
        <View style={styles.meta}>
          {post.specialty ? <Chip label={post.specialty} color={Brand.line} ink={Brand.inkSoft} /> : null}
          {post.price !== undefined ? (
            <Text style={styles.price}>
              {money(post.price)}
              {post.priceNote ? <Text style={styles.priceNote}> {post.priceNote}</Text> : null}
            </Text>
          ) : post.priceNote ? (
            <Text style={styles.priceNote}>{post.priceNote}</Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel={liked ? 'Quitar me sirve' : 'Me sirve'} onPress={() => actions.toggleLike(post.id)} style={styles.action}>
          <Emoji name="pulgar" size={20} style={liked ? undefined : { opacity: 0.55 }} />
          <Text style={[styles.actionText, liked && { color: Brand.chile }]}>Me sirve · {post.likes}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setOpen(!open)} style={styles.action}>
          <Ionicons name="chatbubble-outline" size={17} color={Brand.inkSoft} />
          <Text style={styles.actionText}>{post.comments.length}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            markSource('otro');
            router.push(post.kind === 'servicio' && b.modules.includes('cotizar') ? `/negocio/${b.slug}/cotizar` : `/negocio/${b.slug}`);
          }}
          style={[styles.action, { marginLeft: 'auto' }]}>
          <Text style={[styles.actionText, { color: Brand.chile, fontWeight: '800' }]}>{post.kind === 'servicio' ? 'Me interesa' : 'Ver perfil'}</Text>
          <Ionicons name="chevron-forward" size={16} color={Brand.chile} />
        </Pressable>
      </View>

      {open ? (
        <View style={styles.comments}>
          {post.comments.map((c, i) => (
            <Text key={i} style={styles.comment}>
              <Text style={{ fontWeight: '800' }}>{c.author}: </Text>
              {c.body}
            </Text>
          ))}
          <View style={styles.commentRow}>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Escribe una pregunta o comentario"
              placeholderTextColor={Brand.inkMuted}
              style={styles.input}
              accessibilityLabel="Comentario"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enviar comentario"
              disabled={!comment.trim()}
              onPress={() => {
                actions.addComment(post.id, author, comment.trim());
                setComment('');
              }}
              style={[styles.send, !comment.trim() && { opacity: 0.4 }]}>
              <Ionicons name="send" size={16} color={Brand.white} />
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  filter: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, borderWidth: 1, borderColor: Brand.line, backgroundColor: Brand.white },
  filterText: { fontSize: 13, fontWeight: '700', color: Brand.ink },
  card: { backgroundColor: Brand.white, borderRadius: Radius.lg, padding: 14, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  author: { fontSize: 15, fontWeight: '800', color: Brand.ink },
  muted: { fontSize: 12, color: Brand.inkSoft, marginTop: 1 },
  title: { fontSize: 17, fontWeight: '800', color: Brand.ink, letterSpacing: -0.2 },
  body: { fontSize: 14, color: Brand.ink, lineHeight: 20 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  price: { fontSize: 18, fontWeight: '800', color: Brand.nopalDark },
  priceNote: { fontSize: 12, fontWeight: '600', color: Brand.inkSoft },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16, borderTopWidth: 1, borderTopColor: Brand.line, paddingTop: 10 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 2 },
  actionText: { fontSize: 13, color: Brand.inkSoft, fontWeight: '600' },
  comments: { gap: 8, backgroundColor: Brand.tortilla, borderRadius: Radius.md, padding: 10 },
  comment: { fontSize: 13, color: Brand.ink, lineHeight: 18 },
  commentRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { flex: 1, backgroundColor: Brand.white, borderRadius: Radius.pill, paddingHorizontal: 14, height: 40, fontSize: 14, color: Brand.ink, borderWidth: 1, borderColor: Brand.line },
  send: { width: 40, height: 40, borderRadius: 20, backgroundColor: Brand.chile, alignItems: 'center', justifyContent: 'center' },
});
