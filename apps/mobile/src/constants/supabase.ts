/**
 * ─────────────────────────────────────────────────────────────
 *  CONEXIÓN A SUPABASE · lo único que hay que llenar
 * ─────────────────────────────────────────────────────────────
 * En Supabase: Project Settings → API (o "Connect"). Copia:
 *   - Project URL                 → SUPABASE_URL
 *   - anon / publishable key      → SUPABASE_ANON_KEY
 * Ambos son públicos (van dentro de la app; los datos los protegen las reglas RLS).
 * NUNCA pongas aquí la llave secreta (service_role) ni la contraseña de la base de datos.
 *
 * Mientras estén vacíos, la app funciona con los datos de ejemplo de src/data/mock.ts.
 * También se pueden dar con EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
 */
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';
