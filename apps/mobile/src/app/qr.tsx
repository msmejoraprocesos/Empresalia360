import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Emoji } from '@/components/emoji';
import { QrCode } from '@/components/qr-code';
import { SpeakButton } from '@/components/speak-button';
import { Button, Card, Header, Segmented } from '@/components/ui';
import type { EmojiName } from '@/constants/emoji';
import { Brand } from '@/constants/theme';
import { copyText, openWhatsApp, profileLink, reviewLink, shareText } from '@/lib/links';
import { myBusiness, useApp } from '@/store/app';

type Kind = 'perfil' | 'resena';

const STEPS: { emoji: EmojiName; text: string }[] = [
  { emoji: 'camara', text: 'Tu cliente apunta la cámara de su celular al código' },
  { emoji: 'celular_flecha', text: 'Se abre tu página, sin instalar nada' },
  { emoji: 'calendario', text: 'Te agenda, te escribe o te deja su reseña' },
];

/**
 * QR del profesional: un código que abre su página (para tarjetas, el despacho, la camioneta)
 * y otro que abre directo "Escribir reseña" (para pedir calificación al terminar el trabajo).
 */
export default function MiQR() {
  const router = useRouter();
  const { state } = useApp();
  void state.profileVersion;
  const [kind, setKind] = useState<Kind>('perfil');
  const [msg, setMsg] = useState<string | null>(null);
  const link = kind === 'perfil' ? profileLink(myBusiness.slug) : reviewLink(myBusiness.slug);
  const text =
    kind === 'perfil'
      ? `${myBusiness.name} · ${myBusiness.profession}. Agenda o escríbeme desde aquí: ${link}`
      : `Gracias por tu confianza. ¿Me ayudas con una reseña? Toma 1 minuto: ${link}`;

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Header title="Mi QR" subtitle={myBusiness.name} color={Brand.ink} extraBottom={8}>
          <View style={{ marginTop: 12, paddingHorizontal: 4 }}>
            <Segmented
              dark
              value={kind}
              onChange={(k) => {
                setKind(k);
                setMsg(null);
              }}
              options={[
                { value: 'perfil', label: 'Para que te encuentren' },
                { value: 'resena', label: 'Para que te califiquen' },
              ]}
            />
          </View>
        </Header>

        <View style={{ padding: 16, gap: 12 }}>
          <Card strong style={styles.qrCard}>
            <Text style={styles.title}>{kind === 'perfil' ? 'Escanea para ver mi perfil' : 'Escanea y califícame'}</Text>
            <View style={styles.qrFrame}>
              <QrCode value={link} size={220} />
            </View>
            <Text style={styles.name}>{myBusiness.name}</Text>
            <Text style={styles.sub}>{myBusiness.profession}</Text>
            <Text style={styles.link} selectable numberOfLines={2}>
              {link}
            </Text>
          </Card>

          <SpeakButton
            center
            text={
              kind === 'perfil'
                ? 'Este es tu código. Ponlo en tus tarjetas, en tu despacho o en tu camioneta. Tu cliente lo escanea con la cámara y abre tu página para agendarte.'
                : 'Este código abre directo para que tu cliente te califique. Enséñalo al terminar el trabajo, o mándale la liga por WhatsApp.'
            }
          />

          <Card style={{ gap: 12 }}>
            {STEPS.map((s, i) => (
              <View key={i} style={styles.step}>
                <Emoji name={s.emoji} size={34} />
                <Text style={styles.stepText}>{kind === 'resena' && i === 2 ? 'Te deja su reseña con estrellas' : s.text}</Text>
              </View>
            ))}
          </Card>

          <Button label="Mandar por WhatsApp" icon="logo-whatsapp" onPress={() => openWhatsApp(text)} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button
              label="Compartir"
              variant="ghost"
              icon="share-outline"
              style={{ flex: 1 }}
              onPress={async () => {
                const r = await shareText(text);
                setMsg(r === 'copiado' ? 'Liga copiada' : null);
              }}
            />
            <Button
              label="Copiar liga"
              variant="ghost"
              icon="copy-outline"
              style={{ flex: 1 }}
              onPress={async () => setMsg((await copyText(link)) ? 'Liga copiada' : 'No se pudo copiar: mantén presionada la liga')}
            />
          </View>
          {msg ? <Text style={styles.ok}>{msg}</Text> : null}
          <Card style={{ backgroundColor: Brand.mangoSoft, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Emoji name="nota" size={28} />
            <Text style={[styles.sub, { flex: 1 }]}>Para imprimirlo: toma captura de pantalla y mándala a imprimir. Funciona en tarjetas desde 3 cm.</Text>
          </Card>
          {kind === 'perfil' ? <Button label="Ver lo que ve el cliente" variant="dark" icon="eye-outline" onPress={() => router.push(`/n/${myBusiness.slug}`)} /> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  qrCard: { alignItems: 'center', borderRadius: 28, padding: 22, gap: 4 },
  title: { fontSize: 18, fontWeight: '800', color: Brand.ink, marginBottom: 10 },
  qrFrame: { padding: 10, borderRadius: 16, borderWidth: 2, borderColor: Brand.line, backgroundColor: Brand.white },
  name: { fontSize: 20, fontWeight: '800', color: Brand.ink, marginTop: 12 },
  sub: { fontSize: 14, color: Brand.inkSoft, lineHeight: 20 },
  link: { fontSize: 11, color: Brand.inkMuted, marginTop: 6, textAlign: 'center' },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepText: { flex: 1, fontSize: 15, color: Brand.ink, fontWeight: '600' },
  ok: { textAlign: 'center', color: Brand.nopalDark, fontWeight: '800' },
});
