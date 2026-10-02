import { env } from './env.js';
import { issuer } from './jwt.js';
import { logger } from './logger.js';

/**
 * Comprobaciones al arrancar.
 *
 * Existen porque las dos configuraciones que pueden dejar la API inservible
 * —no poder verificar tokens y no poder hablar con Supabase— se manifiestan
 * igual desde fuera: un 500 en cada petición autenticada, sin pista de cuál de
 * las dos es. Diagnosticarlo obligaba a leer los logs de peticiones fallidas.
 *
 * Mejor decirlo una vez, al arrancar, cuando todavía se está mirando la consola
 * del despliegue.
 *
 * Ninguna aborta el proceso: un fallo de red momentáneo no debe tumbar un
 * servicio que por lo demás funciona. Solo dejan el aviso donde se ve.
 */

/**
 * ¿Se puede verificar la firma de algún token?
 *
 * Supabase firma de dos maneras: con claves asimétricas publicadas en un JWKS
 * (proyectos nuevos) o con un secreto compartido HS256 (los anteriores). Si el
 * proyecto usa HS256 y falta `SUPABASE_JWT_SECRET`, no hay forma de validar
 * nada.
 */
async function checkTokenVerification(): Promise<void> {
  // Con el secreto configurado puede verificar HS256 pase lo que pase.
  if (env.SUPABASE_JWT_SECRET) return;

  let keys: unknown;

  try {
    const response = await fetch(`${issuer}/.well-known/jwks.json`);
    const body: unknown = await response.json();
    keys = (body as { keys?: unknown[] } | null)?.keys;
  } catch {
    // Sin respuesta del JWKS no se puede concluir nada: puede ser un problema
    // de red pasajero. Mejor callarse que dar una falsa alarma.
    return;
  }

  if (Array.isArray(keys) && keys.length > 0) return;

  logger.fatal(
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

/**
 * ¿Son correctas `SUPABASE_URL` y `SUPABASE_ANON_KEY`?
 *
 * Se consulta la raíz de PostgREST con la anon key en lugar de una tabla: las
 * tablas tienen revocado el acceso al rol anónimo, así que una consulta normal
 * daría un error de permisos y no distinguiría "clave mal" de "clave bien".
 */
async function checkSupabaseCredentials(): Promise<void> {
  try {
    const response = await fetch(`${env.SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/`, {
      headers: { apikey: env.SUPABASE_ANON_KEY },
    });

    if (response.ok) return;

    if (response.status === 401) {
      logger.fatal(
        [
          'CONFIGURACION INCORRECTA: SUPABASE_ANON_KEY no es valida.',
          '',
          'Supabase rechaza la clave, asi que ninguna consulta va a funcionar y',
          'TODAS las peticiones autenticadas van a devolver 500.',
          '',
          'Comprueba que copiaste la clave `anon` / `public` entera, sin espacios',
          'ni saltos de linea: Supabase > Project Settings > API Keys.',
        ].join('\n'),
      );
      return;
    }

    logger.warn(
      { status: response.status },
      'Supabase respondio con un estado inesperado al comprobar las credenciales',
    );
  } catch (error) {
    logger.warn(
      { err: error instanceof Error ? error.message : error, url: env.SUPABASE_URL },
      'No se pudo contactar con Supabase al arrancar. Comprueba SUPABASE_URL.',
    );
  }
}

export async function runStartupChecks(): Promise<void> {
  // En paralelo: son independientes y no tiene sentido encadenar sus esperas.
  await Promise.all([checkTokenVerification(), checkSupabaseCredentials()]);
}
