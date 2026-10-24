import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CATEGORIES } from '@/data';
import { PLANS } from '@/data/billing';
import { WORLD, type World } from '@/constants/world';
import { Brand, Radius } from '@/constants/theme';
import { money } from '@/lib/format';

import { Emoji } from './emoji';
import { SpeakButton } from './speak-button';

const WHO: Record<World, { title: string; rule: string; examples: string }> = {
  profesionales: {
    title: 'Profesionista',
    rule: 'Estudiaste una carrera en la universidad y tienes cédula profesional.',
    examples: 'Abogados, contadores, notarios, psicólogos, arquitectos, ingenieros, consultores.',
  },
  oficios: {
    title: 'Oficio',
    rule: 'Aprendiste tu trabajo con la práctica, con un maestro o con un curso técnico.',
    examples: 'Plomeros, electricistas, albañiles, pintores, carpinteros, cerrajeros, técnicos en climas.',
  },
};

/**
 * Guía para que el experto sepa a qué mundo pertenece antes de elegir su categoría.
 * Los mundos no se mezclan: un abogado nunca aparece junto a albañiles, ni al revés.
 */
export function WorldGuide({ value, onChange }: { value: World | null; onChange: (w: World) => void }) {
  const [asking, setAsking] = useState(false);
  const from = (w: World) => Math.min(...PLANS.map((p) => p.prices[w]));

  return (
    <View style={{ gap: 12 }}>
      <SpeakButton
        text="¿A qué mundo perteneces? Si estudiaste una carrera en la universidad y tienes cédula profesional, toca Profesionista. Si aprendiste tu trabajo con la práctica, con un maestro o con un curso técnico, toca Oficio. Los dos mundos no se mezclan: un abogado nunca aparece junto a un albañil."
      />
      {(['profesionales', 'oficios'] as World[]).map((w) => {
        const t = WORLD[w];
        const on = value === w;
        return (
          <Pressable
            key={w}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`${WHO[w].title}. ${WHO[w].rule}`}
            onPress={() => onChange(w)}
            style={[styles.card, { borderColor: on ? t.color : Brand.line, backgroundColor: on ? t.soft : Brand.white }]}>
            <View style={styles.row}>
              <View style={[styles.faces, { backgroundColor: t.color }]}>
                <Emoji name={t.people[1]} size={40} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.title, { color: t.dark }]}>Soy {WHO[w].title.toLowerCase()}</Text>
                <Text style={styles.rule}>{WHO[w].rule}</Text>
              </View>
              <View style={[styles.check, on && { backgroundColor: t.color, borderColor: t.color }]}>{on ? <Ionicons name="checkmark" size={18} color={Brand.white} /> : null}</View>
            </View>
            <Text style={styles.examples}>{WHO[w].examples}</Text>
            <Text style={[styles.price, { color: t.dark }]}>Planes desde {money(from(w))} al mes</Text>
          </Pressable>
        );
      })}

      {!value ? (
        asking ? (
          <View style={styles.quiz}>
            <Emoji name="pensando" size={34} />
            <Text style={styles.quizQ}>¿Tienes cédula profesional (de una carrera universitaria)?</Text>
            <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
              <Pressable accessibilityRole="button" onPress={() => onChange('profesionales')} style={[styles.answer, { backgroundColor: WORLD.profesionales.color }]}>
                <Text style={styles.answerText}>Sí</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => onChange('oficios')} style={[styles.answer, { backgroundColor: WORLD.oficios.color }]}>
                <Text style={styles.answerText}>No</Text>
              </Pressable>
            </View>
            <Text style={styles.small}>Si tienes certificado técnico (por ejemplo CONOCER), eres Oficio: ahí también se muestra tu certificado.</Text>
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => setAsking(true)} style={styles.help}>
            <Emoji name="pensando" size={24} />
            <Text style={styles.helpText}>¿No sabes cuál eres? Te ayudo con una pregunta</Text>
          </Pressable>
        )
      ) : (
        <View style={[styles.ok, { borderColor: WORLD[value].color }]}>
          <Emoji name="palomita" size={24} />
          <Text style={styles.okText}>
            Aparecerás junto a {CATEGORIES.filter((c) => c.group === value).map((c) => c.name.toLowerCase()).slice(0, 4).join(', ')} y similares. Nunca junto a {value === 'profesionales' ? 'albañiles o plomeros' : 'abogados o contadores'}.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 2, borderRadius: Radius.lg, padding: 14, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  faces: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800' },
  rule: { fontSize: 14, color: Brand.ink, lineHeight: 19 },
  examples: { fontSize: 13, color: Brand.inkSoft, lineHeight: 18 },
  price: { fontSize: 13, fontWeight: '800' },
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: Brand.line, alignItems: 'center', justifyContent: 'center' },
  help: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', padding: 8 },
  helpText: { fontSize: 14, fontWeight: '700', color: Brand.chile, textDecorationLine: 'underline' },
  quiz: { alignItems: 'center', gap: 10, backgroundColor: Brand.tortilla, borderRadius: Radius.lg, padding: 14 },
  quizQ: { fontSize: 16, fontWeight: '800', color: Brand.ink, textAlign: 'center' },
  answer: { flex: 1, borderRadius: Radius.pill, paddingVertical: 14, alignItems: 'center' },
  answerText: { color: Brand.white, fontSize: 18, fontWeight: '800' },
  small: { fontSize: 12, color: Brand.inkSoft, textAlign: 'center' },
  ok: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: Radius.md, padding: 10, backgroundColor: Brand.white },
  okText: { flex: 1, fontSize: 13, color: Brand.ink, lineHeight: 18 },
});
