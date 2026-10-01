import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';
import type { Database } from '../types/database.types.js';

export type DbClient = SupabaseClient<Database>;

/**
 * Cliente de Supabase que actua EN NOMBRE del usuario autenticado (ADR-002).
 *
 * Usa la anon key y reenvia el access token del usuario, de modo que Postgres
 * ejecuta la consulta como `authenticated` con `auth.uid()` puesto, y las
 * policies RLS aplican. Si un repository olvidara filtrar por user_id, la base
 * de datos seguiria devolviendo únicamente las filas de ese usuario.
 *
 * Lo contrario sería usar la service_role key, que tiene BYPASSRLS y
 * convertiría la RLS en decoración. No se usa aquí ni en ningun módulo de
 * negocio; una regla de ESLint lo impide (eslint.config.mjs).
 *
 * Se crea uno por request. El coste es despreciable: es un objeto de
 * configuración, no una conexión a la base de datos.
 */
export function createUserClient(accessToken: string): DbClient {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
