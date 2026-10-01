import { z } from 'zod';
import { CAR_LIMITS, maxCarYear } from '../limits.js';

/**
 * Esquemas de validacion de un auto.
 *
 * Viven aqui, en el paquete compartido, porque los usan los dos lados: Express
 * los aplica como ultima palabra y la app movil los reutiliza en los
 * formularios con React Hook Form. Una sola definicion evita que el movil
 * acepte algo que la API rechaza, o al reves.
 *
 * Los CHECK de PostgreSQL son la tercera red (ver docs/database.md).
 */

/**
 * Texto opcional. Trata la cadena vacia como "sin valor": un formulario movil
 * envia '' cuando el usuario borra el campo, y guardar '' en vez de NULL
 * ensucia los datos y complica las consultas.
 *
 * `undefined` se mantiene como `undefined` a proposito: en un PATCH significa
 * "no toques este campo", muy distinto de `null`, que significa "borralo".
 */
function optionalText(max: number, label: string) {
  return z
    .string()
    .trim()
    .max(max, `${label}: maximo ${max} caracteres`)
    .nullable()
    .optional()
    .transform((value) => (value === '' ? null : value));
}

/**
 * Definiciones por campo, reutilizadas por el esquema de creacion y el de
 * edicion. Deliberadamente SIN `.default()`: un default dentro de un esquema
 * parcial haria que un PATCH que no menciona `quantity` la reiniciara a 1.
 */
const fields = {
  brand_id: z.uuid('Selecciona un fabricante valido'),

  model: z
    .string()
    .trim()
    .min(CAR_LIMITS.model.min, 'El modelo es obligatorio')
    .max(CAR_LIMITS.model.max, `El modelo no puede superar ${CAR_LIMITS.model.max} caracteres`),

  vehicle_make: optionalText(CAR_LIMITS.vehicleMake.max, 'La marca del vehiculo'),

  year: z
    .number()
    .int('El año debe ser un numero entero')
    .min(CAR_LIMITS.year.min, `El año debe ser ${CAR_LIMITS.year.min} o posterior`)
    .refine(
      (value) => value <= maxCarYear(),
      // Se comprueba en cada validacion, no al cargar el modulo: un proceso
      // levantado en diciembre debe aceptar el año nuevo sin reiniciarse.
      `El año no puede ser mas de ${CAR_LIMITS.year.maxOffsetFromNow} años en el futuro`,
    )
    .nullable()
    .optional(),

  description: optionalText(CAR_LIMITS.description.max, 'La descripcion'),

  quantity: z
    .number()
    .int('La cantidad debe ser un numero entero')
    .min(CAR_LIMITS.quantity.min, `La cantidad debe ser al menos ${CAR_LIMITS.quantity.min}`)
    .max(CAR_LIMITS.quantity.max, `La cantidad no puede superar ${CAR_LIMITS.quantity.max}`),

  is_favorite: z.boolean(),
};

/** POST /cars */
export const createCarSchema = z.object({
  brand_id: fields.brand_id,
  model: fields.model,
  vehicle_make: fields.vehicle_make,
  year: fields.year,
  description: fields.description,
  quantity: fields.quantity.default(1),
  is_favorite: fields.is_favorite.default(false),
});

/**
 * PATCH /cars/:id — actualizacion parcial.
 *
 * Todo opcional, pero al menos un campo: un PATCH vacio casi siempre es un bug
 * del cliente, y responder 422 lo hace evidente en vez de devolver un 200 que
 * no cambio nada.
 */
export const updateCarSchema = z
  .object({
    brand_id: fields.brand_id.optional(),
    model: fields.model.optional(),
    vehicle_make: fields.vehicle_make,
    year: fields.year,
    description: fields.description,
    quantity: fields.quantity.optional(),
    is_favorite: fields.is_favorite.optional(),
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    'Debes enviar al menos un campo para actualizar',
  );

export type CreateCarInput = z.infer<typeof createCarSchema>;
export type UpdateCarInput = z.infer<typeof updateCarSchema>;
