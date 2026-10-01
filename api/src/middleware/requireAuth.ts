import type { Request, RequestHandler } from 'express';
import { ERROR_CODES } from '@wheel-vault/shared';
import { verifyAccessToken, type AuthenticatedUser } from '../config/jwt.js';
import { createUserClient, type DbClient } from '../config/supabase.js';
import { AppError } from '../shared/errors/AppError.js';

const BEARER = /^Bearer (.+)$/i;

/**
 * Exige un access token valido de Supabase Auth.
 *
 * Deja en el request dos cosas:
 *   req.user -> la identidad, con el id tomado del claim `sub` del token
 *   req.db   -> un cliente de Supabase que actua en nombre de ese usuario
 *
 * El `user_id` SIEMPRE sale de aqui. Nunca del body ni de la query: un cliente
 * podria enviar el id de otra persona.
 */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header) {
    next(AppError.unauthorized(ERROR_CODES.AUTH_TOKEN_MISSING, 'Falta el token de autenticacion'));
    return;
  }

  const match = BEARER.exec(header);
  if (!match?.[1]) {
    next(
      AppError.unauthorized(
        ERROR_CODES.AUTH_TOKEN_INVALID,
        'El header Authorization debe tener el formato "Bearer <token>"',
      ),
    );
    return;
  }

  const token = match[1];

  try {
    req.user = await verifyAccessToken(token);
    req.db = createUserClient(token);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Lee la identidad de un request ya autenticado.
 *
 * Si la ruta se montara por descuido sin `requireAuth`, esto lanza un 500 en
 * vez de continuar sin usuario: es preferible un error ruidoso a una consulta
 * sin filtrar.
 */
export function getUser(req: Request): AuthenticatedUser {
  if (!req.user) {
    throw AppError.internal(
      'Ha ocurrido un error inesperado',
      'getUser() en una ruta sin requireAuth',
    );
  }
  return req.user;
}

export function getDb(req: Request): DbClient {
  if (!req.db) {
    throw AppError.internal(
      'Ha ocurrido un error inesperado',
      'getDb() en una ruta sin requireAuth',
    );
  }
  return req.db;
}
