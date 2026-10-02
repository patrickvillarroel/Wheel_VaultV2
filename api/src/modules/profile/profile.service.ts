import { ERROR_CODES, type UpdateProfileInput } from '@wheel-vault/shared';
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
 * La app la hace al arrancar para decidir si la sesión sigue siendo válida y
 * pintar el nombre del usuario; devolver las dos cosas juntas evita dos
 * requests en el camino critico del arranque.
 *
 * El email viene del token, no de la base de datos: la única fuente de verdad
 * es auth.users y no lo duplicamos en profiles (ADR-001).
 */
export async function getMe(db: DbClient, user: AuthenticatedUser): Promise<MeResponse> {
  const profile = await profileRepository.findById(db, user.id);

  if (!profile) {
    // No debería ocurrir: el trigger handle_new_user() crea el perfil al
    // registrarse. Si pasa, es un fallo real que conviene ver en los logs.
    throw AppError.notFound(ERROR_CODES.PROFILE_NOT_FOUND, 'No se encontró el perfil del usuario');
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

export type Profile = MeResponse['profile'];

function toProfile(row: Awaited<ReturnType<typeof profileRepository.findById>>): Profile {
  if (!row) {
    // No deberia ocurrir: el trigger handle_new_user() crea el perfil al
    // registrarse. Si pasa, es un fallo real que conviene ver en los logs.
    throw AppError.notFound(ERROR_CODES.PROFILE_NOT_FOUND, 'No se encontró el perfil del usuario');
  }

  return {
    id: row.id,
    display_name: row.display_name,
    avatar_path: row.avatar_path,
    bio: row.bio,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getProfile(db: DbClient, userId: string): Promise<Profile> {
  return toProfile(await profileRepository.findById(db, userId));
}

/**
 * Edita el perfil del usuario autenticado.
 *
 * El `userId` sale del token, nunca del cuerpo: no existe forma de pedir la
 * edicion del perfil de otra persona porque el id ni siquiera viaja.
 */
export async function updateProfile(
  db: DbClient,
  userId: string,
  input: UpdateProfileInput,
): Promise<Profile> {
  return toProfile(await profileRepository.update(db, userId, input));
}
