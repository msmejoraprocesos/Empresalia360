import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { useApp } from '@/store/app';

import { supabase } from './supabase';

/**
 * Entrar con el correo: Supabase manda un código de 6 dígitos (sin contraseña).
 * En Supabase → Authentication → Email Templates → "Magic Link", el correo debe incluir {{ .Token }}.
 */
export async function sendCode(email: string, name?: string): Promise<string | null> {
  if (!supabase) return 'La app todavía no está conectada a Supabase.';
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true, data: name ? { full_name: name.trim() } : undefined },
  });
  return error ? friendly(error.message) : null;
}

function friendly(msg: string): string {
  if (/fetch|network|load failed/i.test(msg)) return 'Sin conexión. Revisa tu internet y vuelve a intentar.';
  if (/rate|seconds/i.test(msg)) return 'Espera un minuto antes de pedir otro código.';
  if (/expired|invalid/i.test(msg)) return 'El código no es correcto o ya venció. Pide uno nuevo.';
  return msg;
}

export async function verifyCode(email: string, code: string): Promise<string | null> {
  if (!supabase) return 'La app todavía no está conectada a Supabase.';
  const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' });
  return error ? friendly(error.message) : null;
}

export async function signOut() {
  await supabase?.auth.signOut();
}

/**
 * Envuelve una acción que necesita cuenta (agendar, cotizar, opinar, preguntar, publicar).
 * Con Supabase conectado y sin sesión, primero lleva a "Entrar"; sin Supabase, deja seguir
 * con los datos de ejemplo.
 */
export function useLoginGate() {
  const router = useRouter();
  const { state } = useApp();
  return useCallback(
    (fn: () => void) => {
      if (supabase && !state.account) {
        router.push('/entrar');
        return;
      }
      fn();
    },
    [router, state.account],
  );
}
