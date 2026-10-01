import type { Request, RequestHandler } from 'express';
import type { ZodType, infer as ZodInfer } from 'zod';
import type { ApiErrorDetail } from '@wheel-vault/shared';
import { AppError } from '../shared/errors/AppError.js';

interface Schemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

/**
 * Valida body, params y query con Zod antes de llegar al controlador.
 *
 * El resultado se guarda en `req.validated`, no se reasigna sobre `req.query`:
 * en Express 5 esa propiedad es de solo lectura.
 *
 * Importante: lo que se usa despues es SIEMPRE el dato validado, nunca el
 * original. Zod no solo comprueba, tambien recorta el objeto a los campos
 * declarados, asi que un campo de mas enviado por un cliente malicioso
 * (`"user_id": "..."`) desaparece aqui.
 */
export function validate(schemas: Schemas): RequestHandler {
  return (req, _res, next) => {
    const details: ApiErrorDetail[] = [];

    for (const source of ['body', 'params', 'query'] as const) {
      const schema = schemas[source];
      if (!schema) continue;

      const result = schema.safeParse(req[source]);

      if (result.success) {
        req.validated[source] = result.data;
      } else {
        for (const issue of result.error.issues) {
          const path = issue.path.map(String).join('.');
          details.push({
            field: path ? `${source}.${path}` : source,
            message: issue.message,
          });
        }
      }
    }

    if (details.length > 0) {
      next(AppError.validation('Los datos enviados no son validos', details));
      return;
    }

    next();
  };
}

/**
 * Recupera un dato ya validado, con su tipo.
 *
 * Se vuelve a pasar el esquema para que TypeScript infiera el tipo exacto sin
 * necesidad de un `as`:
 *
 *     const body = validated(req, 'body', createCarSchema);  // tipado
 */
export function validated<S extends ZodType>(
  req: Request,
  source: 'body' | 'params' | 'query',
  _schema: S,
): ZodInfer<S> {
  const value = req.validated[source];
  if (value === undefined) {
    throw AppError.internal(
      'Ha ocurrido un error inesperado',
      `validated(req, '${source}') sin el middleware validate() en la ruta`,
    );
  }
  return value as ZodInfer<S>;
}
