import type { RequestHandler } from 'express';
import { getDb, getUser } from '../../middleware/requireAuth.js';
import { validated } from '../../middleware/validate.js';
import { sendSuccess } from '../../shared/http/envelope.js';
import {
  brandCarsQuerySchema,
  brandIdParamsSchema,
  listBrandsQuerySchema,
} from './brands.schema.js';
import * as brandsService from './brands.service.js';

export const list: RequestHandler = async (req, res) => {
  const { q } = validated(req, 'query', listBrandsQuerySchema);

  const brands = await brandsService.listBrands(getDb(req), q);

  sendSuccess(res, brands);
};

export const getById: RequestHandler = async (req, res) => {
  const { id } = validated(req, 'params', brandIdParamsSchema);

  const brand = await brandsService.getBrand(getDb(req), id);

  sendSuccess(res, brand);
};

export const listCars: RequestHandler = async (req, res) => {
  const { id } = validated(req, 'params', brandIdParamsSchema);
  const query = validated(req, 'query', brandCarsQuerySchema);

  const page = await brandsService.listBrandCars(getDb(req), getUser(req).id, id, query);

  sendSuccess(res, page.items, { meta: page.meta });
};
