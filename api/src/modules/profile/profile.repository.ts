import type { DbClient } from '../../config/supabase.js';
import type { Tables, TablesUpdate } from '../../types/database.types.js';
import { AppError } from '../../shared/errors/AppError.js';

export type ProfileRow = Tables<'profiles'>;

/**
 * Acceso a datos del perfil. No conoce HTTP ni reglas de negocio.
 *
 * El `.eq('id', userId)` es redundante con la policy RLS, que ya restringe a
 * `id = auth.uid()`. Se mantiene a proposito: la consulta debe ser correcta por
 * si misma, y la RLS es la red de seguridad, no el filtro principal (ADR-002).
 */
export async function findById(db: DbClient, userId: string): Promise<ProfileRow | null> {
  const { data, error } = await db.from('profiles').select('*').eq('id', userId).maybeSingle();

  if (error) {
    // El detalle de Postgres se queda en el log; al cliente le llega un 500
    // genérico (ver middleware/errorHandler.ts).
    throw AppError.internal('Ha ocurrido un error inesperado', {
      operation: 'profiles.findById',
      code: error.code,
      message: error.message,
    });
  }

  return data;
}

/**
 * Devuelve `null` si no se actualizo nada, que con la RLS activa solo puede
 * significar que el perfil no es de este usuario.
 */
export async function update(
  db: DbClient,
  userId: string,
  patch: TablesUpdate<'profiles'>,
): Promise<ProfileRow | null> {
  const { data, error } = await db
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw AppError.internal('Ha ocurrido un error inesperado', {
      operation: 'profiles.update',
      code: error.code,
      message: error.message,
    });
  }

  return data;
}
