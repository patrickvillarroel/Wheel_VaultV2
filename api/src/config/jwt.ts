import {
  createRemoteJWKSet,
  decodeProtectedHeader,
  errors as joseErrors,
  jwtVerify,
  type JWTPayload,
} from 'jose';
import { ERROR_CODES } from '@wheel-vault/shared';
import { env } from './env.js';
import { AppError } from '../shared/errors/AppError.js';

/**
 * Verificación local del access token que emite Supabase Auth.
 *
 * Por que local y no `supabase.auth.getUser(token)`:
 * getUser() hace una llamada de red al servidor de auth en CADA request. Es
 * autoritativo (detecta sesiones revocadas al instante) pero añade latencia a
 * todo y consume el rate limit del servicio. Verificar la firma localmente es
 * lo que recomienda Supabase para el camino normal; el precio es que un token
 * revocado sigue siendo válido hasta su `exp` (1 hora). Es la misma limitacion
 * que ya aceptamos en el logout (docs/security.md).
 *
 * Por que dos caminos de verificación:
 * Supabase migro a claves asimetricas (ES256/RS256) publicadas en un JWKS. Los
 * proyectos creados antes del cambio siguen firmando con un secreto compartido
 * (HS256). Soportamos ambos para que el proyecto funcione sin importar cuando
 * se creo, y para que la migración a asimetricas no rompa nada.
 */

export const issuer = `${env.SUPABASE_URL.replace(/\/+$/, '')}/auth/v1`;

/**
 * `createRemoteJWKSet` cachea las claves públicas en memoria y solo vuelve a
 * pedirlas cuando aparece un `kid` desconocido (rotacion de claves).
 */
const remoteJwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

const legacySecret = env.SUPABASE_JWT_SECRET
  ? new TextEncoder().encode(env.SUPABASE_JWT_SECRET)
  : null;

export interface AuthenticatedUser {
  id: string;
  email: string | null;
}

export async function verifyAccessToken(token: string): Promise<AuthenticatedUser> {
  let header: ReturnType<typeof decodeProtectedHeader>;
  try {
    header = decodeProtectedHeader(token);
  } catch {
    throw AppError.unauthorized(ERROR_CODES.AUTH_TOKEN_INVALID, 'El token no es válido');
  }

  let payload: JWTPayload;
  try {
    // `issuer` y `audience` no son opcionales: sin ellos, un token válido de
    // OTRO proyecto de Supabase sería aceptado por el nuestro.
    const options = { issuer, audience: 'authenticated' };

    if (header.alg === 'HS256') {
      if (!legacySecret) {
        throw AppError.internal(
          'El proyecto firma con HS256 pero falta SUPABASE_JWT_SECRET',
          'Configura SUPABASE_JWT_SECRET en api/.env (ver docs/supabase-setup.md)',
        );
      }
      ({ payload } = await jwtVerify(token, legacySecret, options));
    } else {
      ({ payload } = await jwtVerify(token, remoteJwks, options));
    }
  } catch (error) {
    if (error instanceof AppError) throw error;

    if (error instanceof joseErrors.JWTExpired) {
      throw AppError.unauthorized(ERROR_CODES.AUTH_TOKEN_EXPIRED, 'La sesión ha expirado');
    }
    throw AppError.unauthorized(
      ERROR_CODES.AUTH_TOKEN_INVALID,
      'El token no es válido',
      // Solo para los logs: el motivo real nunca sale al cliente.
      error instanceof Error ? error.message : 'error desconocido',
    );
  }

  const subject = payload.sub;
  if (typeof subject !== 'string' || subject.length === 0) {
    throw AppError.unauthorized(
      ERROR_CODES.AUTH_TOKEN_INVALID,
      'El token no identifica a un usuario',
    );
  }

  const email = typeof payload['email'] === 'string' ? payload['email'] : null;

  return { id: subject, email };
}

/**
 * Avisa al arrancar si la API no va a poder verificar NINGUN token.
 *
 * Supabase firma de dos maneras: con claves asimetricas publicadas en un JWKS
 * (proyectos nuevos) o con un secreto compartido HS256 (proyectos antiguos). Si
 * el proyecto usa HS256 y falta `SUPABASE_JWT_SECRET`, cada peticion
 * autenticada devuelve un 500 y la app queda inservible.
 *
 * Eso se descubria leyendo los logs de 40 peticiones fallidas. Mejor decirlo una
 * vez, al arrancar, cuando todavia se esta mirando la consola del despliegue.
 *
 * No aborta el proceso: un fallo de red momentaneo al consultar el JWKS no debe
 * tumbar un servicio que por lo demas funciona. Solo deja el aviso donde se ve.
 */
export async function warnIfTokensCannotBeVerified(): Promise<void> {
  // Con el secreto configurado puede verificar HS256 pase lo que pase.
  if (env.SUPABASE_JWT_SECRET) return;

  try {
    const response = await fetch(`${issuer}/.well-known/jwks.json`);
    const body: unknown = await response.json();
    const keys = (body as { keys?: unknown[] } | null)?.keys;

    // Hay claves publicas: el proyecto firma con claves asimetricas y no
    // necesita el secreto.
    if (Array.isArray(keys) && keys.length > 0) return;
  } catch {
    // Sin respuesta del JWKS no se puede concluir nada. Se deja constancia y se
    // sigue: el servicio puede estar bien y Supabase solo tardar en responder.
    return;
  }

  // JWKS vacio y sin secreto: no hay forma de verificar una firma.
  throw new Error(
    [
      'CONFIGURACION INCOMPLETA: falta SUPABASE_JWT_SECRET.',
      '',
      'Tu proyecto de Supabase firma los tokens con el secreto compartido',
      '(HS256), pero esa variable no esta configurada. TODAS las peticiones',
      'autenticadas van a devolver 500.',
      '',
      'El valor esta en Supabase > Project Settings > JWT Keys > legacy JWT secret.',
    ].join('\n'),
  );
}
