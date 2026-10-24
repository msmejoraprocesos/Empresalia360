import 'expo-sqlite/localStorage/install';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

// Expertalia 360 todavía no tiene proyecto de Supabase propio: solo se conecta si se definen
// las variables de entorno. Sin ellas usa los datos de ejemplo (no lee ni escribe en ninguna base).
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Cliente de Supabase. Es `null` mientras no existan las variables
 * EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ver .env.example);
 * en ese caso la app funciona con los datos de ejemplo de src/data/mock.ts.
 */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: localStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

if (supabase) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export const isSupabaseConfigured = supabase !== null;
