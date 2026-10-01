import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ERROR_CODES } from '@wheel-vault/shared';
import { logger } from '../config/logger.js';
import { AppError } from '../shared/errors/AppError.js';
import { sendError } from '../shared/http/envelope.js';

/** Ruta inexistente. Va despues de todos los routers. */
export const notFound: RequestHandler = (req, _res, next) => {
  next(
    AppError.notFound(ERROR_CODES.ROUTE_NOT_FOUND, `La ruta ${req.method} ${req.path} no existe`),
  );
};

/**
 * Manejador de errores central. Unico punto por donde sale un error al cliente.
 *
 * Regla: lo unico que se envia es `code` y un `message` pensado para una
 * persona. El stack trace, el error de Postgres, la ruta del archivo o el
 * detalle de por que fallo la firma de un token se quedan en el log, asociados
 * al `request_id` que si viaja.
 */
export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  // JSON malformado: lo lanza express.json() antes de llegar a ningun esquema.
  if (
    error instanceof SyntaxError &&
    'status' in error &&
    error.status === 400 &&
    'body' in error
  ) {
    sendError(res, {
      status: 400,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'El cuerpo de la peticion no es JSON valido',
      requestId: req.requestId,
    });
    return;
  }

  if (error instanceof AppError) {
    // Los 4xx son parte del funcionamiento normal (token caducado, dato
    // invalido); solo se registran con detalle los 5xx.
    const level = error.statusCode >= 500 ? 'error' : 'debug';
    logger[level](
      {
        requestId: req.requestId,
        userId: req.user?.id,
        code: error.code,
        statusCode: error.statusCode,
        internal: error.internal,
        ...(error.statusCode >= 500 ? { stack: error.stack } : {}),
      },
      error.message,
    );

    sendError(res, {
      status: error.statusCode,
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
      requestId: req.requestId,
    });
    return;
  }

  // Cualquier otra cosa es un fallo no previsto: se registra entero y al
  // cliente solo le llega un mensaje generico.
  logger.error(
    {
      requestId: req.requestId,
      userId: req.user?.id,
      err: error,
    },
    'Error no controlado',
  );

  sendError(res, {
    status: 500,
    code: ERROR_CODES.INTERNAL_ERROR,
    message: 'Ha ocurrido un error inesperado',
    requestId: req.requestId,
  });
};
