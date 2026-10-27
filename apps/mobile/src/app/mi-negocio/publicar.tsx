import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PostCard } from '@/components/community-feed';
import { PlanLock, useMyPlan } from '@/components/plan-lock';
import { BottomBar, Button, Field, Header } from '@/components/ui';
import { Brand, Radius } from '@/constants/theme';
import type { Post } from '@/data/types';
import { useLoginGate } from '@/lib/auth';
import { myBusiness, useApp } from '@/store/app';

const KINDS: { v: Post['kind']; label: string; hint: string }[] = [
  { v: 'servicio', label: 'Servicio', hint: 'Anuncia algo que ofreces, con precio si quieres' },
  { v: 'consejo', label: 'Consejo', hint: 'Comparte lo que sabes: genera confianza' },
  { v: 'evento', label: 'Evento', hint: 'Taller, plática o jornada' },
];

export default function Publicar() {
  const router = useRouter();
  const { actions } = useApp();
  const gate = useLoginGate();
  const plan = useMyPlan();
  const [kind, setKind] = useState<Post['kind']>('servicio');
  const [specialty, setSpecialty] = useState<string | undefined>(myBusiness.specialties[0]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [price, setPrice] = useState('');
  const [priceNote, setPriceNote] = useState('');

  const draft: Post = {
    id: 'vista',
    businessSlug: myBusiness.slug,
    kind,
    specialty,
    title: title || 'Título de tu publicación',
    body: body || 'Aquí va el texto que verán los clientes.',
    price: kind === 'servicio' && Number(price) ? Number(price) : undefined,
    priceNote: kind === 'servicio' ? priceNote || undefined : undefined,
    dateLabel: 'ahora',
    likes: 0,
    comments: [],
  };
  const valid = title.trim().length > 4 && body.trim().length > 10;

  if (plan === 'estandar') {
    return (
      <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
        <Header title="Publicar en la comunidad" subtitle="Lo ven clientes de tu zona" color={Brand.ink} />
        <View style={{ padding: 16 }}>
          <PlanLock need="premium" title="Publica en el muro" text="Anuncia tus servicios, comparte consejos y eventos con los clientes de tu zona. Es parte de Premium y VIP." />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title="Publicar en la comunidad" subtitle="Lo ven clientes de tu zona" color={Brand.ink} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 130 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Tipo de publicación</Text>
        <View style={{ gap: 8 }}>
          {KINDS.map((k) => {
            const on = kind === k.v;
            return (
              <Pressable key={k.v} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setKind(k.v)} style={[styles.kind, on && styles.kindOn]}>
                <Text style={[styles.kindTitle, on && { color: Brand.white }]}>{k.label}</Text>
                <Text style={[styles.kindHint, on && { color: '#D6E0F0' }]}>{k.hint}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Especialidad</Text>
        <View style={styles.wrap}>
          {myBusiness.specialties.map((s) => (
            <Pressable key={s} accessibilityRole="button" onPress={() => setSpecialty(s)} style={[styles.pill, specialty === s && styles.pillOn]}>
              <Text style={[styles.pillText, specialty === s && { color: Brand.white }]}>{s}</Text>
            </Pressable>
          ))}
        </View>

        <Field label="Título" value={title} onChangeText={setTitle} placeholder={kind === 'consejo' ? '¿Te despidieron? No firmes nada todavía' : 'Divorcio voluntario en 8 semanas'} />
        <Field label="Texto" value={body} onChangeText={setBody} multiline placeholder="Explica qué incluye, para quién es y cómo contactarte." />
        {kind === 'servicio' ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="Precio (opcional)" value={price} onChangeText={(t) => setPrice(t.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="$350" />
            </View>
            <View style={{ flex: 1.3 }}>
              <Field label="Aclaración" value={priceNote} onChangeText={setPriceNote} placeholder="primera consulta" />
            </View>
          </View>
        ) : null}

        <Text style={styles.label}>Vista previa</Text>
        <View pointerEvents="none">
          <PostCard post={draft} />
        </View>
      </ScrollView>
      <BottomBar>
        <Button
          label="Publicar"
          icon="megaphone-outline"
          disabled={!valid}
          onPress={() => gate(() => {
            actions.publishPost({ kind, specialty, title: title.trim(), body: body.trim(), price: draft.price, priceNote: draft.priceNote });
            router.replace('/panel/comunidad');
          })}
        />
      </BottomBar>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '800', color: Brand.inkSoft, textTransform: 'uppercase', letterSpacing: 0.4 },
  kind: { padding: 14, borderRadius: Radius.md, backgroundColor: Brand.white, borderWidth: 1, borderColor: Brand.line },
  kindOn: { backgroundColor: Brand.chile, borderColor: Brand.chile },
  kindTitle: { fontSize: 15, fontWeight: '800', color: Brand.ink },
  kindHint: { fontSize: 12, color: Brand.inkSoft, marginTop: 2 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.pill, borderWidth: 1, borderColor: Brand.line, backgroundColor: Brand.white },
  pillOn: { backgroundColor: Brand.chile, borderColor: Brand.chile },
  pillText: { fontSize: 13, fontWeight: '600', color: Brand.ink },
});
