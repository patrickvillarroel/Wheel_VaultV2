import type { AuthError } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { EMAIL_CONFIRMED_URL, RESET_PASSWORD_URL } from './deepLinks';

/**
 * Operaciones de autenticación.
 *
 * Hablan directamente con Supabase Auth, no con nuestra API (ADR-001). Lo que
 * añade esta capa es traducir los errores: Supabase los devuelve en ingles y
 * algunos son demasiado técnicos para enseñarselos a alguien.
 */

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
    options: {
      // Llega a auth.users.raw_user_meta_data, de donde lo lee el trigger
      // handle_new_user() para crear el perfil.
      data: { display_name: displayName },
      // Sin esto, el enlace de confirmación lleva al Site URL del proyecto
      // —una página web— en vez de devolver a quien se registra a la app.
      emailRedirectTo: EMAIL_CONFIRMED_URL,
    },
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
    redirectTo: RESET_PASSWORD_URL,
  });

  if (error) throw translate(error);
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });

  if (error) throw translate(error);
}
