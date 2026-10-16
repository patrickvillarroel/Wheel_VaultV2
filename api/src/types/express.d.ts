import type { AuthenticatedUser } from '../config/jwt.js';
import type { DbClient } from '../config/supabase.js';

/**
 * Propiedades que los middlewares añaden al Request de Express.
 *
 * `user` y `db` son opcionales en el tipo porque solo existen DESPUES de pasar
 * por requireAuth. Los controladores de rutas protegidas las obtienen con los
 * helpers de middleware/requireAuth.ts, que fallan de forma explicita si la
 * ruta se montara por error sin ese middleware.
 */
declare global {
  namespace Express {
    interface Request {
      /** Identificador único del request; aparece en los logs y en los errores. */
      requestId: string;
      user?: AuthenticatedUser;
      /** Cliente de Supabase que actua en nombre del usuario (ADR-002). */
      db?: DbClient;
      /** Datos ya validados por Zod. Ver middleware/validate.ts. */
      validated: {
        body?: unknown;
        params?: unknown;
        query?: unknown;
      };
    }
  }
}

export {};
