import type { AuthError } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

/**
 * Operaciones de autenticación.
 *
 * Hablan directamente con Supabase Auth, no con nuestra API (ADR-001). Lo que
 * añade esta capa es traducir los errores: Supabase los devuelve en ingles y
 * algunos son demasiado técnicos para enseñarselos a alguien.
 */

/** Deep link del correo de recuperación. Debe coincidir con `scheme` en app.json. */
const RESET_REDIRECT_URL = 'wheelvault://reset-password';

export class AuthFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthFailure';
  }
}

/**
 * "Invalid login credentials" se traduce sin distinguir si el fallo fue el email
 * o la contraseña: decir cual de los dos permitiría averiguar que direcciones
 * estan registradas.
 */
function translate(error: AuthError): AuthFailure {
  const message = error.message.toLowerCase();

  if (message.includes('invalid login credentials')) {
    return new AuthFailure('El correo o la contraseña no son correctos');
  }
  if (message.includes('email not confirmed')) {
    return new AuthFailure('Confirma tu correo antes de iniciar sesión. Revisa tu bandeja.');
  }
  if (message.includes('user already registered') || message.includes('already been registered')) {
    return new AuthFailure('Ya existe una cuenta con ese correo');
  }
  if (message.includes('password should be at least')) {
    return new AuthFailure('La contraseña es demasiado corta');
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return new AuthFailure('Demasiados intentos. Espera unos minutos.');
  }
  if (message.includes('network') || message.includes('fetch')) {
    return new AuthFailure('No se pudo conectar. Revisa tu conexión.');
  }

  return new AuthFailure('No se pudo completar la operación. Inténtalo de nuevo.');
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw translate(error);
}

export interface SignUpResult {
  /** `true` si hay que confirmar el correo antes de poder entrar. */
  needsEmailConfirmation: boolean;
}

export async function signUp(
  email: string,
  password: string,
  displayName: string,
): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Llega a auth.users.raw_user_meta_data, de donde lo lee el trigger
    // handle_new_user() para crear el perfil.
    options: { data: { display_name: displayName } },
  });

  if (error) throw translate(error);

  // Con la confirmación por correo activada, Supabase crea el usuario pero no
  // abre sesión: devuelve user sin session.
  return { needsEmailConfirmation: data.session === null };
}

/**
 * Cierra la sesión.
 *
 * Por defecto el SDK revoca el refresh token en el servidor, de modo que la
 * sesión muere en todos los dispositivos. Eso exige una llamada de red, y si
 * falla —sin cobertura, servidor caído— el usuario se quedaría dentro de una
 * app de la que acaba de pedir salir.
 *
 * Por eso hay un segundo intento local: revocar en el servidor es lo deseable,
 * pero borrar las credenciales de ESTE dispositivo es lo imprescindible.
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (!error) return;

  await supabase.auth.signOut({ scope: 'local' });
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: RESET_REDIRECT_URL,
  });

  if (error) throw translate(error);
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });

  if (error) throw translate(error);
}
