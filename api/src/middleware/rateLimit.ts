import rateLimit, { type Options } from 'express-rate-limit';
import { ERROR_CODES } from '@wheel-vault/shared';
import { isTest } from '../config/env.js';
import { sendError } from '../shared/http/envelope.js';

/**
 * Limite de peticiones por IP.
 *
 * Es una defensa contra abuso y fuerza bruta, no contra un ataque distribuido:
 * el almacen esta en memoria, asi que con varias instancias cada una lleva su
 * propia cuenta. Para produccion con mas de una instancia hay que mover el
 * almacen a Redis (anotado en docs/security.md, fase 10).
 *
 * El login NO pasa por aqui: lo gestiona Supabase Auth, que tiene su propio
 * rate limiting (ADR-001).
 */

const baseOptions: Partial<Options> = {
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  // Desactivado en tests: si no, las pruebas se estorban entre si.
  skip: () => isTest,
  handler: (req, res) => {
    sendError(res, {
      status: 429,
      code: ERROR_CODES.RATE_LIMITED,
      message: 'Demasiadas peticiones. Intentalo de nuevo en unos minutos.',
      requestId: req.requestId,
    });
  },
};

/** Para toda la API. */
export const globalRateLimit = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 100,
});

/**
 * Para las operaciones que escriben. Mas estricto: crear, editar o borrar es
 * caro y nadie legitimo necesita 100 escrituras en 15 minutos desde el movil.
 */
export const writeRateLimit = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 30,
});
