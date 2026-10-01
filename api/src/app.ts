import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import express, { Router, type Express } from 'express';
import cors, { type CorsOptions } from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env, isProduction } from './config/env.js';
import { logger } from './config/logger.js';
import { requestContext } from './middleware/requestContext.js';
import { globalRateLimit } from './middleware/rateLimit.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { sendSuccess } from './shared/http/envelope.js';
import { meRouter } from './modules/profile/profile.routes.js';
import { carsRouter } from './modules/cars/cars.routes.js';

/**
 * Las apps nativas no envian cabecera `Origin`, asi que CORS no las afecta: es
 * una proteccion del navegador. Esta lista existe para Expo Web en desarrollo y
 * para cualquier frontend web futuro.
 *
 * Un origen no permitido recibe la respuesta sin las cabeceras CORS y es el
 * navegador quien la bloquea. Devolver un error aqui produciria un 500 confuso.
 */
const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || env.CORS_ORIGINS.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  credentials: false,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86_400,
};

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');

  // Detras de un proxy (Railway, Render, Fly) la IP real viene en
  // X-Forwarded-For. Sin esto, el rate limiting contaria todas las peticiones
  // como si vinieran de la misma IP: la del proxy.
  if (isProduction) {
    app.set('trust proxy', 1);
  }

  // Primero de la cadena: todo lo que venga despues necesita el requestId.
  app.use(requestContext);

  app.use(
    pinoHttp({
      logger,
      genReqId: (req: IncomingMessage) =>
        (req as IncomingMessage & { requestId?: string }).requestId ?? randomUUID(),
      // El healthcheck se consulta cada pocos segundos: inundaria los logs.
      autoLogging: { ignore: (req) => req.url === '/health' },
      /**
       * Una linea por peticion en vez del volcado completo de req y res.
       * Ademas de legible es mas seguro: al no registrar las cabeceras, no hay
       * forma de que un token acabe en el log ni aunque falle la redaccion.
       */
      serializers: {
        req: (req) => ({ method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    }),
  );

  app.use(helmet());
  app.use(cors(corsOptions));

  // Antes del rate limiting: el healthcheck del hosting no debe agotar el cupo.
  app.get('/health', (_req, res) => {
    sendSuccess(res, { status: 'ok', uptime: process.uptime(), env: env.NODE_ENV });
  });

  // Limite de tamaño: un body gigante consume memoria antes de validarse.
  app.use(express.json({ limit: '100kb' }));

  app.use(globalRateLimit);

  const v1 = Router();
  v1.use('/me', meRouter);
  v1.use('/cars', carsRouter);
  // Fase 7: v1.use('/brands', brandsRouter)
  // Fase 8: v1.use('/stats', statsRouter)
  // Fase 9: v1.use('/profile', profileRouter)
  app.use('/api/v1', v1);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
