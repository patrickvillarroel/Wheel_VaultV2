import pino from 'pino';
import { env, isProduction, isTest } from './env.js';

/**
 * Logger estructurado.
 *
 * `redact` es un control de seguridad, no una comodidad: sin el, un
 * `logger.info({ req })` escribiria el header Authorization completo (es decir,
 * un token valido) en los logs, que suelen acabar en servicios de terceros.
 */
export const logger = pino({
  level: isTest ? 'silent' : env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'headers.authorization',
      'password',
      '*.password',
      '*.access_token',
      '*.refresh_token',
      'req.body.password',
      'req.body.email',
    ],
    censor: '[REDACTED]',
  },
  // En desarrollo, logs legibles por humanos. En produccion, JSON en una linea
  // para que cualquier agregador (Logtail, Datadog, CloudWatch) lo entienda.
  ...(isProduction || isTest
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      }),
});
