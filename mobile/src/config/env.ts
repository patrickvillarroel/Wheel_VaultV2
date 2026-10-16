/**
 * Configuración de la app.
 *
 * Solo variables EXPO_PUBLIC_: cualquier otra cosa no llega al bundle. Y todo
 * lo que llega al bundle es público, así que aquí no puede haber secretos
 * (ver mobile/.env.example).
 *
 * Se leen por su nombre completo y literal, no con `process.env[nombre]`: Expo
 * las sustituye en tiempo de compilacion buscando el texto exacto, y un acceso
 * dinamico se quedaría en `undefined`.
 */

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Falta ${name}. Copia mobile/.env.example a mobile/.env y rellena los valores.`,
    );
  }
  return value;
}

export const env = {
  supabaseUrl: required(process.env.EXPO_PUBLIC_SUPABASE_URL, 'EXPO_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: required(
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  ),
  apiUrl: (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/+$/, ''),
} as const;
