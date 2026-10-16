import { z } from 'zod';
import { PAGINATION } from '@wheel-vault/shared';
import { AppError } from './errors/AppError.js';

/**
 * Paginación por cursor (keyset), no por offset.
 *
 * Con OFFSET, la pagina 50 obliga a Postgres a leer y descartar 1 000 filas, y
 * si se inserta un auto mientras el usuario pagina, los elementos se duplican o
 * se saltan. El keyset no tiene ninguno de los dos problemas y aquí no cuesta
 * más: el indice cars_user_created_idx ya esta en el orden (created_at, id).
 *
 * El cursor apunta a la ULTIMA fila devuelta. Se incluye el `id` ademas de la
 * fecha porque dos autos creados en el mismo milisegundo empatarian y uno se
 * perderia entre paginas.
 */

const cursorPayloadSchema = z.object({
  /** created_at de la última fila, normalizado a ISO con Z. */
  c: z.iso.datetime(),
  /** id de la última fila, para desempatar. */
  i: z.uuid(),
});

export interface Cursor {
  createdAt: string;
  id: string;
}

export function encodeCursor(cursor: Cursor): string {
  const payload = {
    c: new Date(cursor.createdAt).toISOString(),
    i: cursor.id,
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

/**
 * El cursor es opaco para el cliente, pero no es un secreto ni un control de
 * acceso: manipularlo solo permite empezar a paginar desde otro punto de los
 * datos DEL PROPIO usuario, porque la consulta sigue filtrando por user_id y la
 * RLS sigue activa. Se válida por correccion, para fallar con un 422 claro en
 * vez de producir una consulta rara.
 */
export function decodeCursor(raw: string): Cursor {
  let parsed: unknown;

  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    throw AppError.validation('El cursor de paginación no es válido', [
      { field: 'query.cursor', message: 'Formato incorrecto' },
    ]);
  }

  const result = cursorPayloadSchema.safeParse(parsed);
  if (!result.success) {
    throw AppError.validation('El cursor de paginación no es válido', [
      { field: 'query.cursor', message: 'Contenido incorrecto' },
    ]);
  }

  return { createdAt: result.data.c, id: result.data.i };
}

export interface Page<T> {
  items: T[];
  meta: {
    next_cursor: string | null;
    has_more: boolean;
  };
}

/**
 * Convierte el resultado de la consulta en una pagina.
 *
 * El repositorio pide `limit + 1` filas: si llega la de más, sabemos que hay
 * siguiente pagina sin lanzar un COUNT aparte, que en una tabla con RLS es caro.
 */
export function buildPage<T>(rows: T[], limit: number, toCursor: (row: T) => Cursor): Page<T> {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items.at(-1);

  return {
    items,
    meta: {
      next_cursor: hasMore && last ? encodeCursor(toCursor(last)) : null,
      has_more: hasMore,
    },
  };
}

/** Parametros de paginación comunes a cualquier listado. */
export const paginationQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1, 'limit debe ser al menos 1')
    .max(PAGINATION.maxLimit, `limit no puede superar ${PAGINATION.maxLimit}`)
    .default(PAGINATION.defaultLimit),
  cursor: z.string().min(1).optional(),
});
