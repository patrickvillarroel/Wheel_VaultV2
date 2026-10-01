import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

/**
 * Asigna un identificador unico a cada request.
 *
 * Es el puente entre lo que ve el usuario y el log del servidor: cuando la API
 * devuelve un 500, el cliente recibe `request_id` y nada mas; con ese id se
 * localiza en los logs la causa real, que nunca viaja por la red.
 *
 * Debe ir el PRIMERO de la cadena para que cualquier error posterior ya lo
 * tenga disponible.
 */
export const requestContext: RequestHandler = (req, res, next) => {
  req.requestId = randomUUID();
  req.validated = {};
  res.setHeader('X-Request-Id', req.requestId);
  next();
};
