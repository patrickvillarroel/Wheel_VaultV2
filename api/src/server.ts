/**
 * Bootstrap del servidor.
 *
 * Separado de app.ts a proposito: los tests importan `createApp()` y le hablan
 * en memoria con supertest, sin abrir ningun puerto.
 */
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`API escuchando en http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

/**
 * Apagado ordenado: deja terminar las peticiones en curso antes de salir. Sin
 * esto, cada despliegue cortaria requests a medias.
 */
function shutdown(signal: string): void {
  logger.info(`${signal} recibido, cerrando servidor...`);

  server.close(() => {
    logger.info('Servidor cerrado');
    process.exit(0);
  });

  // Si alguna conexion se queda colgada, no esperamos indefinidamente.
  setTimeout(() => {
    logger.error('Cierre forzado tras 10s de espera');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Promesa rechazada sin manejar');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Excepcion no capturada');
  process.exit(1);
});
