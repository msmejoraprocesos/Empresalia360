import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Emoji } from '@/components/emoji';
import { SpeakButton } from '@/components/speak-button';
import { Button, Header } from '@/components/ui';
import { Brand, Radius, Shadow } from '@/constants/theme';
import { sendCode, signOut, verifyCode } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useApp } from '@/store/app';

/** Entrar o crear cuenta con el correo: llega un código de 6 números, sin contraseña. */
export default function Entrar() {
  const router = useRouter();
  const params = useLocalSearchParams<{ siguiente?: string }>();
  const { state, actions } = useApp();
  const [step, setStep] = useState<'correo' | 'codigo'>('correo');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const done = () => (router.canGoBack() ? router.back() : router.replace((params.siguiente as never) ?? '/'));

  if (state.account) {
    return (
      <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
        <Header title="Mi cuenta" />
        <View style={{ padding: 20, gap: 14 }}>
          <View style={[styles.card, Shadow, { alignItems: 'center' }]}>
            <Emoji name="palomita" size={56} />
            <Text style={styles.big}>Ya entraste</Text>
            <Text style={styles.sub}>{state.account.email}</Text>
            {state.account.businessSlug ? <Text style={styles.sub}>Tu perfil profesional está en línea</Text> : null}
          </View>
          <Field label="¿Cómo te llamas?" value={name || state.account.name} onChangeText={setName} placeholder="Nombre y apellido" />
          {name.trim() && name.trim() !== state.account.name ? <Button label="Guardar nombre" variant="ghost" onPress={() => actions.setName(name.trim())} /> : null}
          <Button label="Listo" onPress={done} />
          <Button label="Salir de mi cuenta" variant="ghost" icon="log-out-outline" onPress={() => signOut()} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Brand.tortilla }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Header extraBottom={36}>
          <View style={{ alignItems: 'center', gap: 8, marginTop: 6 }}>
            <Emoji name={step === 'correo' ? 'sobre' : 'llave_entrar'} size={64} />
            <Text style={styles.title}>{step === 'correo' ? 'Entra con tu correo' : 'Escribe el código'}</Text>
            <Text style={styles.headSub}>{step === 'correo' ? 'Sin contraseña. Te mandamos un código.' : `Lo mandamos a ${email.trim()}`}</Text>
            <SpeakButton
              dark
              center
              text={
                step === 'correo'
                  ? 'Escribe tu correo y toca Mandarme el código. Te llegará un correo con seis números.'
                  : 'Abre tu correo, busca el mensaje de Expertalia y escribe aquí los seis números.'
              }
            />
          </View>
        </Header>

        <View style={{ padding: 20, marginTop: -30, gap: 14 }}>
          {!isSupabaseConfigured ? (
            <View style={[styles.card, Shadow]}>
              <Text style={styles.sub}>Esta versión de muestra no guarda cuentas. Puedes usar toda la app sin entrar.</Text>
            </View>
          ) : step === 'correo' ? (
            <View style={[styles.card, Shadow]}>
              <Field label="Tu correo" value={email} onChangeText={(t) => { setEmail(t); setError(null); }} placeholder="nombre@correo.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
              <Field label="Tu nombre (opcional)" value={name} onChangeText={setName} placeholder="Así te verán los expertos" autoComplete="name" />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button
                label={busy ? 'Mandando…' : 'Mandarme el código'}
                icon="mail-outline"
                disabled={!emailOk || busy}
                onPress={async () => {
                  setBusy(true);
                  const err = await sendCode(email, name);
                  setBusy(false);
                  if (err) setError(err);
                  else setStep('codigo');
                }}
              />
            </View>
          ) : (
            <View style={[styles.card, Shadow]}>
              <TextInput
                value={code}
                onChangeText={(t) => {
                  setCode(t.replace(/\D/g, '').slice(0, 6));
                  setError(null);
                }}
                placeholder="• • • • • •"
                placeholderTextColor={Brand.inkMuted}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
                style={styles.code}
                accessibilityLabel="Código de 6 números"
                autoFocus
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button
                label={busy ? 'Revisando…' : 'Entrar'}
                icon="checkmark"
                disabled={code.length < 6 || busy}
                onPress={async () => {
                  setBusy(true);
                  const err = await verifyCode(email, code);
                  if (err) {
                    setBusy(false);
                    setError(err);
                    return;
                  }
                  await actions.refreshAccount();
                  setBusy(false);
                  done();
                }}
              />
              {busy ? <ActivityIndicator color={Brand.chile} /> : null}
              <Button label="Cambiar correo o pedir otro código" variant="ghost" small onPress={() => { setStep('correo'); setCode(''); }} />
            </View>
          )}
          <Text style={[styles.sub, { textAlign: 'center' }]}>Solo usamos tu correo para tu cuenta. Los expertos ven tu nombre, no tu correo.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={Brand.inkMuted} {...rest} style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', color: Brand.white, textAlign: 'center' },
  headSub: { color: '#D6E0F0', fontSize: 15, textAlign: 'center' },
  card: { backgroundColor: Brand.white, borderRadius: Radius.lg, padding: 16, gap: 14 },
  big: { fontSize: 20, fontWeight: '800', color: Brand.ink },
  sub: { fontSize: 13, color: Brand.inkSoft, lineHeight: 18 },
  label: { fontSize: 14, fontWeight: '700', color: Brand.ink },
  input: { height: 54, borderRadius: Radius.md, borderWidth: 1, borderColor: Brand.line, paddingHorizontal: 14, fontSize: 17, color: Brand.ink, backgroundColor: Brand.white },
  code: { height: 72, borderRadius: Radius.md, borderWidth: 2, borderColor: Brand.chile, fontSize: 34, fontWeight: '800', letterSpacing: 10, textAlign: 'center', color: Brand.ink },
  error: { color: '#A32020', fontWeight: '700', fontSize: 14 },
});
