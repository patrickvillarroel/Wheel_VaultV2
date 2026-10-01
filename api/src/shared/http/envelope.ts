import type { Response } from 'express';
import type { ApiErrorDetail, ErrorCode } from '@wheel-vault/shared';

/**
 * Formato único de respuesta de la API. Ver docs/api.md.
 *
 * Que todo salga por estas dos funciones evita que un endpoint invente su
 * propia forma y que el cliente tenga que manejar varios formatos.
 */

export function sendSuccess<T, M = undefined>(
  res: Response,
  data: T,
  options?: { status?: number; meta?: M },
): void {
  const status = options?.status ?? 200;
  const body: { success: true; data: T; meta?: M } = { success: true, data };
  if (options?.meta !== undefined) {
    body.meta = options.meta;
  }
  res.status(status).json(body);
}

export function sendError(
  res: Response,
  params: {
    status: number;
    code: ErrorCode;
    message: string;
    details?: ApiErrorDetail[];
    requestId: string;
  },
): void {
  res.status(params.status).json({
    success: false,
    error: {
      code: params.code,
      message: params.message,
      ...(params.details ? { details: params.details } : {}),
    },
    request_id: params.requestId,
  });
}

/** 204: sin cuerpo. Se usa en DELETE. */
export function sendNoContent(res: Response): void {
  res.status(204).end();
}
