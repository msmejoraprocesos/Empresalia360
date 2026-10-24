import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Brand, Radius, Shadow } from '@/constants/theme';
import { CATEGORIES, categoryBySlug, getBusiness } from '@/data';
import type { Question } from '@/data/types';
import { useLoginGate } from '@/lib/auth';
import { useApp } from '@/store/app';

import { ProAvatar } from './business-card';
import { Button, Chip } from './ui';

/** Formulario para que el cliente pregunte a los expertos de una categoría. */
export function AskForm() {
  const { state, actions } = useApp();
  const gate = useLoginGate();
  const cats = CATEGORIES.filter((c) => c.group === state.lookingFor);
  const [picked, setCategorySlug] = useState<string>();
  const categorySlug = picked && cats.some((c) => c.slug === picked) ? picked : cats[0]?.slug ?? 'abogados';
  const [body, setBody] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <View style={[styles.card, Shadow]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="help-buoy" size={22} color={Brand.jacaranda} />
        <Text style={styles.title}>Pregunta gratis a un experto</Text>
      </View>
      <Text style={styles.sub}>Tu pregunta es anónima y la responden expertos verificados de la zona.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {cats.map((c) => {
          const on = c.slug === categorySlug;
          return (
            <Pressable key={c.slug} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setCategorySlug(c.slug)} style={[styles.pill, on && styles.pillOn]}>
              <Text style={[styles.pillText, on && { color: Brand.white }]}>{c.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <TextInput
        value={body}
        onChangeText={(t) => {
          setBody(t);
          setSent(false);
        }}
        placeholder="Ej. ¿Me pueden despedir estando incapacitado?"
        placeholderTextColor={Brand.inkMuted}
        multiline
        style={styles.input}
        accessibilityLabel="Tu pregunta"
      />
      {sent ? <Text style={styles.ok}>Listo. Te avisamos cuando un experto responda.</Text> : null}
      <Button
        label="Publicar pregunta"
        small
        disabled={body.trim().length < 10}
        onPress={() => gate(() => {
          actions.askQuestion({ categorySlug, body: body.trim() });
          setBody('');
          setSent(true);
        })}
      />
    </View>
  );
}

/** Pregunta con las respuestas de los expertos. En modo profesional permite responder. */
export function QuestionCard({ q, canAnswer }: { q: Question; canAnswer?: boolean }) {
  const router = useRouter();
  const { state, actions } = useApp();
  const gate = useLoginGate();
  const [answer, setAnswer] = useState('');
  const cat = categoryBySlug(q.categorySlug);

  return (
    <View style={[styles.card, Shadow]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Text style={styles.sub}>
          {q.author} · {q.dateLabel}
        </Text>
        <Chip label={q.specialty ?? cat?.name ?? ''} color={Brand.jacarandaSoft} ink={Brand.jacaranda} />
      </View>
      <Text style={styles.question}>{q.body}</Text>

      {q.answers.length === 0 ? <Text style={styles.sub}>Aún sin respuesta.</Text> : null}
      {q.answers.map((a, i) => {
        const b = getBusiness(a.businessSlug);
        if (!b) return null;
        const marked = state.helpful.includes(`${q.id}:${i}`);
        return (
          <View key={i} style={styles.answer}>
            <Pressable accessibilityRole="button" onPress={() => router.push(`/negocio/${b.slug}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ProAvatar business={b} size={32} />
              <View style={{ flex: 1 }}>
                <Text style={styles.expert}>{b.name}</Text>
                <Text style={styles.sub}>
                  {b.profession} · ★ {b.rating.toFixed(1)}
                </Text>
              </View>
              <Text style={styles.link}>Ver perfil</Text>
            </Pressable>
            <Text style={styles.body}>{a.body}</Text>
            <Pressable accessibilityRole="button" onPress={() => gate(() => actions.markHelpful(q.id, i))} style={styles.helpful}>
              <Ionicons name={marked ? 'thumbs-up' : 'thumbs-up-outline'} size={15} color={marked ? Brand.chile : Brand.inkSoft} />
              <Text style={[styles.sub, marked && { color: Brand.chile, fontWeight: '700' }]}>Útil · {a.helpful}</Text>
            </Pressable>
          </View>
        );
      })}

      {canAnswer ? (
        <View style={{ gap: 8 }}>
          <TextInput
            value={answer}
            onChangeText={setAnswer}
            placeholder="Escribe tu respuesta. Las buenas respuestas te traen clientes."
            placeholderTextColor={Brand.inkMuted}
            multiline
            style={styles.input}
            accessibilityLabel="Tu respuesta"
          />
          <Button
            label="Responder"
            small
            variant="dark"
            disabled={answer.trim().length < 10}
            onPress={() => gate(() => {
              actions.answerQuestion(q.id, answer.trim());
              setAnswer('');
            })}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Brand.white, borderRadius: Radius.lg, padding: 14, gap: 10 },
  title: { fontSize: 16, fontWeight: '800', color: Brand.ink },
  sub: { fontSize: 12, color: Brand.inkSoft },
  question: { fontSize: 16, fontWeight: '700', color: Brand.ink, lineHeight: 22 },
  answer: { gap: 8, backgroundColor: Brand.tortilla, borderRadius: Radius.md, padding: 10 },
  expert: { fontSize: 14, fontWeight: '800', color: Brand.ink },
  body: { fontSize: 14, color: Brand.ink, lineHeight: 20 },
  link: { fontSize: 12, fontWeight: '800', color: Brand.chile },
  helpful: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' },
  input: { minHeight: 80, borderRadius: Radius.md, borderWidth: 1, borderColor: Brand.line, padding: 12, fontSize: 14, color: Brand.ink, backgroundColor: Brand.white, textAlignVertical: 'top' },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.pill, borderWidth: 1, borderColor: Brand.line, backgroundColor: Brand.white },
  pillOn: { backgroundColor: Brand.jacaranda, borderColor: Brand.jacaranda },
  pillText: { fontSize: 12, fontWeight: '700', color: Brand.ink },
  ok: { fontSize: 13, fontWeight: '700', color: Brand.nopalDark },
});
