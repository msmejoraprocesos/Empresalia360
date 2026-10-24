import 'expo-sqlite/localStorage/install';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/constants/supabase';

// Se conecta solo si hay URL y llave (en src/constants/supabase.ts o en variables de entorno).
// Sin ellas usa los datos de ejemplo (no lee ni escribe en ninguna base).
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || SUPABASE_ANON_KEY;

/**
 * Cliente de Supabase. Es `null` mientras no se llenen src/constants/supabase.ts
 * (o las variables EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
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
