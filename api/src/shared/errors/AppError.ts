import { ERROR_CODES, type ApiErrorDetail, type ErrorCode } from '@wheel-vault/shared';

/**
 * Error de dominio con un código y un estado HTTP asociados.
 *
 * Todo lo que llega al cliente pasa por aquí. Cualquier otra excepción se
 * convierte en un 500 genérico sin detalle, para no filtrar información interna
 * (ver middleware/errorHandler.ts).
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly details: ApiErrorDetail[] | undefined;
  /** Contexto solo para los logs. NUNCA viaja al cliente. */
  readonly internal: unknown;

  constructor(params: {
    statusCode: number;
    code: ErrorCode;
    message: string;
    details?: ApiErrorDetail[];
    internal?: unknown;
  }) {
    super(params.message);
    this.name = 'AppError';
    this.statusCode = params.statusCode;
    this.code = params.code;
    this.details = params.details;
    this.internal = params.internal;
    Error.captureStackTrace?.(this, AppError);
  }

  static unauthorized(
    code: Extract<
      ErrorCode,
      'AUTH_TOKEN_MISSING' | 'AUTH_TOKEN_INVALID' | 'AUTH_TOKEN_EXPIRED'
    > = ERROR_CODES.AUTH_TOKEN_INVALID,
    message = 'No autenticado',
    internal?: unknown,
  ): AppError {
    return new AppError({ statusCode: 401, code, message, internal });
  }

  static forbidden(message = 'No tienes permiso para realizar esta acción'): AppError {
    return new AppError({ statusCode: 403, code: ERROR_CODES.FORBIDDEN, message });
  }

  static notFound(code: ErrorCode, message: string): AppError {
    return new AppError({ statusCode: 404, code, message });
  }

  static conflict(code: ErrorCode, message: string): AppError {
    return new AppError({ statusCode: 409, code, message });
  }

  static validation(message: string, details?: ApiErrorDetail[]): AppError {
    return new AppError({
      statusCode: 422,
      code: ERROR_CODES.VALIDATION_ERROR,
      message,
      ...(details ? { details } : {}),
    });
  }

  static internal(message = 'Ha ocurrido un error inesperado', internal?: unknown): AppError {
    return new AppError({
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_ERROR,
      message,
      internal,
    });
  }
}
