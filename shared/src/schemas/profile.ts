import { z } from 'zod';
import { PROFILE_LIMITS } from '../limits.js';

/**
 * Edición del perfil.
 *
 * Solo el nombre visible. El correo NO se toca aquí: cambiarlo es un flujo de
 * Supabase Auth con su propia confirmación por email, y permitirlo desde este
 * endpoint dejaría la cuenta y el perfil apuntando a direcciones distintas.
 *
 * `bio` y `avatar_path` ya existen en la base de datos pero no se exponen
 * todavía: no hay pantalla que los use y añadirlos sería inventar alcance.
 */
export const updateProfileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(PROFILE_LIMITS.displayName.min, 'Escribe tu nombre')
    .max(
      PROFILE_LIMITS.displayName.max,
      `El nombre no puede superar ${PROFILE_LIMITS.displayName.max} caracteres`,
    ),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
