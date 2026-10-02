import rateLimit, { ipKeyGenerator, type Options } from 'express-rate-limit';
import { ERROR_CODES } from '@wheel-vault/shared';
import { isTest } from '../config/env.js';
import { sendError } from '../shared/http/envelope.js';

/**
 * Limite de peticiones por IP.
 *
 * Es una defensa contra abuso y fuerza bruta, no contra un ataque distribuido:
 * el almacen esta en memoria, así que con varias instancias cada una lleva su
 * propia cuenta. Para producción con más de una instancia hay que mover el
 * almacen a Redis (anotado en docs/security.md, fase 10).
 *
 * El login NO pasa por aquí: lo gestiona Supabase Auth, que tiene su propio
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
      message: 'Demasiadas peticiones. Inténtalo de nuevo en unos minutos.',
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
 *
 * Cuenta por USUARIO, no por IP. Por IP tiene dos problemas en direcciones
 * opuestas: varias personas detrás del mismo NAT —una oficina, una universidad,
 * una red movil— se consumen el cupo entre ellas, y una sola cuenta puede
 * esquivarlo cambiando de red. Estas rutas van siempre detrás de `requireAuth`,
 * así que aquí `req.user` ya existe.
 */
export const writeRateLimit = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 30,
  keyGenerator: (req) =>
    // `ipKeyGenerator` normaliza IPv6 a su prefijo /64: sin el, un cliente con
    // IPv6 estrena direccion en cada peticion y el limite no cuenta nada.
    req.user ? `user:${req.user.id}` : `ip:${ipKeyGenerator(req.ip ?? '')}`,
});
