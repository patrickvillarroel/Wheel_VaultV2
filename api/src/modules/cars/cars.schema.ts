import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/pagination.js';

/**
 * Esquemas propios de la API. Los de creacion y edicion de un auto viven en
 * `@wheel-vault/shared` porque la app movil los reutiliza en sus formularios;
 * estos de aqui describen la URL y no tienen sentido fuera del backend.
 */

export const carIdParamsSchema = z.object({
  id: z.uuid('El identificador del auto no es valido'),
});

export const listCarsQuerySchema = paginationQuerySchema.extend({
  brand_id: z.uuid('El identificador del fabricante no es valido').optional(),

  /** Busqueda por modelo. Se recorta para que " " no filtre por nada. */
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => (value === '' ? undefined : value)),

  /**
   * Solo por fecha de alta.
   *
   * Ordenar por nombre requiere un cursor compuesto sobre (model, id), y el
   * modelo es texto libre del usuario: construir ese filtro obliga a escapar
   * comas, parentesis y comillas dentro de la sintaxis `or=()` de PostgREST, y
   * equivocarse ahi es un fallo de filtrado. No hay ninguna pantalla del diseño
   * que lo pida, asi que entra con la funcion de busqueda, donde se hara bien.
   */
  sort: z.enum(['recent', 'oldest']).default('recent'),
});

export type ListCarsQuery = z.infer<typeof listCarsQuerySchema>;
export type CarIdParams = z.infer<typeof carIdParamsSchema>;
