import { ERROR_CODES } from '@wheel-vault/shared';
import type { DbClient } from '../../config/supabase.js';
import type { AuthenticatedUser } from '../../config/jwt.js';
import { AppError } from '../../shared/errors/AppError.js';
import * as profileRepository from './profile.repository.js';

export interface MeResponse {
  user: {
    id: string;
    email: string | null;
  };
  profile: {
    id: string;
    display_name: string;
    avatar_path: string | null;
    bio: string | null;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Identidad + perfil en una sola llamada.
 *
 * La app la hace al arrancar para decidir si la sesion sigue siendo valida y
 * pintar el nombre del usuario; devolver las dos cosas juntas evita dos
 * requests en el camino critico del arranque.
 *
 * El email viene del token, no de la base de datos: la unica fuente de verdad
 * es auth.users y no lo duplicamos en profiles (ADR-001).
 */
export async function getMe(db: DbClient, user: AuthenticatedUser): Promise<MeResponse> {
  const profile = await profileRepository.findById(db, user.id);

  if (!profile) {
    // No deberia ocurrir: el trigger handle_new_user() crea el perfil al
    // registrarse. Si pasa, es un fallo real que conviene ver en los logs.
    throw AppError.notFound(ERROR_CODES.PROFILE_NOT_FOUND, 'No se encontro el perfil del usuario');
  }

  return {
    user: { id: user.id, email: user.email },
    profile: {
      id: profile.id,
      display_name: profile.display_name,
      avatar_path: profile.avatar_path,
      bio: profile.bio,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    },
  };
}
