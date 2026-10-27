import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Emoji } from '@/components/emoji';
import { Button, Card, Field } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { CATEGORIES } from '@/data';
import { remote } from '@/data/remote';
import type { Business } from '@/data/types';
import { useLoginGate } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useApp } from '@/store/app';

/**
 * "¿Eres tú? Reclama este perfil": para los perfiles que dio de alta el administrador.
 * El experto entra con su correo, deja su cédula y un mensaje, y el administrador lo aprueba.
 */
export function ClaimCard({ business }: { business: Business }) {
  const { state } = useApp();
  const gate = useLoginGate();
  const [open, setOpen] = useState(false);
  const [license, setLicense] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const oficio = CATEGORIES.find((c) => c.slug === business.categorySlug)?.group === 'oficios';

  // Quien ya tiene su propio perfil no puede reclamar otro
  if (state.account?.businessSlug && state.account.businessSlug !== business.slug) return null;

  if (sent) {
    return (
      <Card style={[styles.card, { backgroundColor: '#DDF3E8' }]}>
        <Emoji name="palomita" size={40} />
        <Text style={styles.h}>¡Listo! Recibimos tu solicitud</Text>
        <Text style={styles.text}>La revisamos y te avisamos. En cuanto se apruebe, este perfil pasa a tu cuenta y lo administras desde “Soy profesional u oficio”.</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Emoji name="mano_arriba" size={40} />
        <View style={{ flex: 1 }}>
          <Text style={styles.h}>¿Eres tú? Reclama este perfil</Text>
          <Text style={styles.text}>Nosotros lo dimos de alta. Hazlo tuyo para contestar a tus clientes, cambiar tus datos y fotos.</Text>
        </View>
      </View>
      {open ? (
        <>
          <Field
            label={oficio ? 'Certificado u oficio (opcional)' : 'Tu cédula profesional'}
            value={license}
            onChangeText={setLicense}
            placeholder={oficio ? 'Ej. CONOCER EC0586' : 'Número de cédula'}
            keyboardType={oficio ? 'default' : 'number-pad'}
          />
          <Field label="¿Cómo te comprobamos que eres tú?" value={note} onChangeText={setNote} multiline placeholder="Ej. Mi WhatsApp es el mismo del perfil" />
          {error ? <Text style={{ color: '#A32020', fontWeight: '700' }}>{error}</Text> : null}
          <Button
            label={sending ? 'Enviando…' : 'Enviar solicitud'}
            icon="checkmark"
            disabled={sending || (!oficio && license.replace(/\D/g, '').length < 6)}
            onPress={async () => {
              setSending(true);
              setError('');
              const ok = isSupabaseConfigured ? await remote.claim(business, license.trim(), note.trim()) : true;
              setSending(false);
              if (ok) setSent(true);
              else setError('No se pudo enviar. Puede que ya lo hayas reclamado; si no, intenta de nuevo.');
            }}
          />
        </>
      ) : (
        <Button label="Sí, soy yo" icon="person-outline" onPress={() => gate(() => setOpen(true))} />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, borderWidth: 2, borderColor: '#E3B04B', backgroundColor: '#FFF9EA' },
  h: { fontSize: 17, fontWeight: '800', color: Brand.ink },
  text: { fontSize: 14, color: Brand.ink, lineHeight: 20 },
});
