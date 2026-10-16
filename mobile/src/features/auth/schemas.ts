import { PASSWORD_LIMITS, PROFILE_LIMITS } from '@wheel-vault/shared';
import { z } from 'zod';

/**
 * Validación de los formularios de autenticación.
 *
 * Viven aquí y no en `shared/` porque nuestra API no participa: el registro y
 * el login los válida Supabase Auth (ADR-001). Lo que si se comparte son los
 * limites, para que la longitud minima de contraseña no se desincronice con la
 * configurada en el dashboard.
 */

const email = z
  .string()
  .trim()
  .min(1, 'Introduce tu correo')
  .pipe(z.email('Ese correo no parece válido'));

const password = z
  .string()
  .min(PASSWORD_LIMITS.min, `La contraseña debe tener al menos ${PASSWORD_LIMITS.min} caracteres`)
  .max(PASSWORD_LIMITS.max, 'La contraseña es demasiado larga');

export const loginSchema = z.object({
  email,
  // Al iniciar sesión no se aplica la longitud minima: si la regla cambiara,
  // alguien con una contraseña antigua válida no podría ni intentarlo.
  password: z.string().min(1, 'Introduce tu contraseña'),
});

export const registerSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(PROFILE_LIMITS.displayName.min, 'Escribe tu nombre')
      .max(PROFILE_LIMITS.displayName.max, `Máximo ${PROFILE_LIMITS.displayName.max} caracteres`),
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    password,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
