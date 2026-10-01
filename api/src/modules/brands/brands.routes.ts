import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import * as brandsController from './brands.controller.js';
import {
  brandCarsQuerySchema,
  brandIdParamsSchema,
  listBrandsQuerySchema,
} from './brands.schema.js';

export const brandsRouter = Router();

/**
 * Solo lectura en el MVP. La creacion de marcas privadas existe en la base de
 * datos (ADR-003) pero no se expone todavia: con 32 marcas en el catalogo no
 * hace falta, y añadir el endpoint sin pantalla que lo use seria inventar
 * alcance.
 *
 * Aun siendo el catalogo mayormente global, las rutas exigen token: el
 * `car_count` de cada marca son datos personales del usuario.
 */
brandsRouter.use(requireAuth);

brandsRouter.get('/', validate({ query: listBrandsQuerySchema }), brandsController.list);

brandsRouter.get('/:id', validate({ params: brandIdParamsSchema }), brandsController.getById);

brandsRouter.get(
  '/:id/cars',
  validate({ params: brandIdParamsSchema, query: brandCarsQuerySchema }),
  brandsController.listCars,
);
