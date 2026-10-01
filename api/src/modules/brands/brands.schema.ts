import { z } from 'zod';
import { BRAND_LIMITS } from '@wheel-vault/shared';
import { paginationQuerySchema } from '../../shared/pagination.js';

export const brandIdParamsSchema = z.object({
  id: z.uuid('El identificador del fabricante no es valido'),
});

export const listBrandsQuerySchema = z.object({
  /** Filtro por nombre, para el selector de fabricante del formulario. */
  q: z
    .string()
    .trim()
    .max(BRAND_LIMITS.name.max)
    .optional()
    .transform((value) => (value === '' ? undefined : value)),
});

/** Mismo contrato de paginacion que GET /cars. */
export const brandCarsQuerySchema = paginationQuerySchema.extend({
  sort: z.enum(['recent', 'oldest']).default('recent'),
});

export type BrandIdParams = z.infer<typeof brandIdParamsSchema>;
export type ListBrandsQuery = z.infer<typeof listBrandsQuerySchema>;
export type BrandCarsQuery = z.infer<typeof brandCarsQuerySchema>;
