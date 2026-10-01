import type { RequestHandler } from 'express';
import { createCarSchema, updateCarSchema } from '@wheel-vault/shared';
import { getDb, getUser } from '../../middleware/requireAuth.js';
import { validated } from '../../middleware/validate.js';
import { sendNoContent, sendSuccess } from '../../shared/http/envelope.js';
import { carIdParamsSchema, listCarsQuerySchema } from './cars.schema.js';
import * as carsService from './cars.service.js';

/**
 * Traduce HTTP <-> dominio. No conoce Supabase ni reglas de negocio.
 *
 * Express 5 reenvia solo las promesas rechazadas al manejador de errores, asi
 * que no hace falta try/catch.
 */

export const list: RequestHandler = async (req, res) => {
  const query = validated(req, 'query', listCarsQuerySchema);

  const page = await carsService.listCars(getDb(req), getUser(req).id, query);

  sendSuccess(res, page.items, { meta: page.meta });
};

export const getById: RequestHandler = async (req, res) => {
  const { id } = validated(req, 'params', carIdParamsSchema);

  const car = await carsService.getCar(getDb(req), getUser(req).id, id);

  sendSuccess(res, car);
};

export const create: RequestHandler = async (req, res) => {
  const body = validated(req, 'body', createCarSchema);

  const car = await carsService.createCar(getDb(req), getUser(req).id, body);

  res.setHeader('Location', `/api/v1/cars/${car.id}`);
  sendSuccess(res, car, { status: 201 });
};

export const update: RequestHandler = async (req, res) => {
  const { id } = validated(req, 'params', carIdParamsSchema);
  const body = validated(req, 'body', updateCarSchema);

  const car = await carsService.updateCar(getDb(req), getUser(req).id, id, body);

  sendSuccess(res, car);
};

export const remove: RequestHandler = async (req, res) => {
  const { id } = validated(req, 'params', carIdParamsSchema);

  await carsService.deleteCar(getDb(req), getUser(req).id, id);

  sendNoContent(res);
};
