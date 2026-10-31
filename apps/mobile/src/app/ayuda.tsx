import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Emoji } from '@/components/emoji';
import { SpeakButton } from '@/components/speak-button';
import { Button, Card, Header } from '@/components/ui';
import type { EmojiName } from '@/constants/emoji';
import { SOPORTE_CORREO, SOPORTE_WHATSAPP } from '@/constants/contacto';
import { Brand } from '@/constants/theme';
import { openWhatsApp } from '@/lib/links';

const FAQ: { emoji: EmojiName; q: string; a: string }[] = [
  { emoji: 'lupa', q: '¿Cómo encuentro a quien me ayude?', a: 'En Inicio toca un dibujo o escribe tu problema (también puedes hablar con el micrófono). Verás a los expertos más cercanos con sus estrellas.' },
  { emoji: 'calendario', q: '¿Cómo agendo una cita?', a: 'Abre el perfil del experto y toca Agendar. Elige el día y la hora. La cita aparece en Mis citas y el experto la confirma.' },
  { emoji: 'billete', q: '¿Cómo pago?', a: 'Le pagas directo al experto, en efectivo al atenderte o por transferencia. Si eliges transferencia, te mostramos sus datos. La app no te cobra comisión.' },
  { emoji: 'estrella', q: '¿Cómo dejo una reseña?', a: 'Después de tu cita, en Mis citas toca Calificar. También puedes escanear el QR del experto o abrir la liga que te mande.' },
  { emoji: 'trabajador', q: 'Soy profesionista, ¿cómo me registro?', a: 'En Perfil toca Soy profesionista, entra con tu correo y llena tu perfil. Apareces de inmediato; la palomita de verificado llega cuando revisamos tu cédula.' },
  { emoji: 'celular_flecha', q: '¿Para qué es mi QR?', a: 'Si eres profesional, en Más → Mi QR tienes un código que abre tu página. Ponlo en tus tarjetas o tu despacho. Tiene otra versión para pedir reseñas.' },
  { emoji: 'escudo', q: '¿Es seguro?', a: 'Tu teléfono y tu correo no se muestran a los expertos. Las reseñas solo se pueden escribir con cuenta, y las falsas u ofensivas se ocultan.' },
];

export default function Ayuda() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title="Ayuda" subtitle="Preguntas frecuentes" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}>
        {FAQ.map((f, i) => (
          <Pressable key={i} accessibilityRole="button" accessibilityState={{ expanded: open === i }} onPress={() => setOpen(open === i ? null : i)}>
            <Card style={{ gap: 8 }}>
              <View style={styles.row}>
                <Emoji name={f.emoji} size={30} />
                <Text style={styles.q}>{f.q}</Text>
              </View>
              {open === i ? (
                <>
                  <Text style={styles.a}>{f.a}</Text>
                  <SpeakButton compact text={`${f.q} ${f.a}`} />
                </>
              ) : null}
            </Card>
          </Pressable>
        ))}
        <Text style={styles.h}>¿No encontraste tu respuesta?</Text>
        {SOPORTE_WHATSAPP ? <Button label="Escríbenos por WhatsApp" icon="logo-whatsapp" onPress={() => openWhatsApp('Hola, necesito ayuda con Expertalia 360: ', SOPORTE_WHATSAPP)} /> : null}
        <Button
          label="Escríbenos un correo"
          icon="mail-outline"
          variant={SOPORTE_WHATSAPP ? 'ghost' : 'primary'}
          onPress={() => Linking.openURL(`mailto:${SOPORTE_CORREO}?subject=${encodeURIComponent('Ayuda con Expertalia 360')}`)}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  q: { flex: 1, fontSize: 16, fontWeight: '800', color: Brand.ink },
  a: { fontSize: 15, color: Brand.ink, lineHeight: 22 },
  h: { fontSize: 16, fontWeight: '800', color: Brand.ink, marginTop: 10 },
});
