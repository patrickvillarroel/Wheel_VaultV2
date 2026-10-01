import { Router } from 'express';
import { createCarSchema, updateCarSchema } from '@wheel-vault/shared';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import { writeRateLimit } from '../../middleware/rateLimit.js';
import * as carsController from './cars.controller.js';
import { carIdParamsSchema, listCarsQuerySchema } from './cars.schema.js';

export const carsRouter = Router();

// Toda la coleccion es privada: no hay ninguna ruta publica aqui.
carsRouter.use(requireAuth);

carsRouter.get('/', validate({ query: listCarsQuerySchema }), carsController.list);

carsRouter.post('/', writeRateLimit, validate({ body: createCarSchema }), carsController.create);

carsRouter.get('/:id', validate({ params: carIdParamsSchema }), carsController.getById);

carsRouter.patch(
  '/:id',
  writeRateLimit,
  validate({ params: carIdParamsSchema, body: updateCarSchema }),
  carsController.update,
);

carsRouter.delete(
  '/:id',
  writeRateLimit,
  validate({ params: carIdParamsSchema }),
  carsController.remove,
);
