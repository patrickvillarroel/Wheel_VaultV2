/**
 * Bootstrap del servidor.
 *
 * FASE 0: solo levanta Express con /health para validar el entorno de
 * desarrollo. Los middlewares de seguridad (helmet, cors, rate limit),
 * `requireAuth`, el manejo centralizado de errores y los modulos de negocio
 * entran en la FASE 2 (ver docs/architecture.md, roadmap).
 */
import express from 'express';
import { env } from './config/env.js';

const app = express();

app.disable('x-powered-by');

app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    data: { status: 'ok', uptime: process.uptime(), env: env.NODE_ENV },
  });
});

const server = app.listen(env.PORT, () => {
  console.warn(`[api] escuchando en http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

function shutdown(signal: string): void {
  console.warn(`[api] ${signal} recibido, cerrando servidor...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
