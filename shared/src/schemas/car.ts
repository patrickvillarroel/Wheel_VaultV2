import { z } from 'zod';
import { CAR_LIMITS, maxCarYear } from '../limits.js';

/**
 * Esquemas de validación de un auto.
 *
 * Viven aquí, en el paquete compartido, porque los usan los dos lados: Express
 * los aplica como última palabra y la app movil los reutiliza en los
 * formularios con React Hook Form. Una sola definición evita que el movil
 * acepte algo que la API rechaza, o al reves.
 *
 * Los CHECK de PostgreSQL son la tercera red (ver docs/database.md).
 */

/**
 * Texto opcional. Trata la cadena vacía como "sin valor": un formulario movil
 * envia '' cuando el usuario borra el campo, y guardar '' en vez de NULL
 * ensucia los datos y complica las consultas.
 *
 * `undefined` se mantiene como `undefined` a proposito: en un PATCH significa
 * "no toques este campo", muy distinto de `null`, que significa "borralo".
 */
function optionalText(max: number, label: string) {
  return (
    z
      .string()
      .trim()
      .max(max, `${label}: máximo ${max} caracteres`)
      .transform((value) => (value === '' ? null : value))
      .nullable()
      // `.optional()` va EL ÚLTIMO a propósito: así la clave queda opcional en
      // el tipo inferido. Con el `.transform()` por fuera, TypeScript exigía
      // escribir `vehicle_make: undefined` en cada PATCH parcial, que es justo
      // lo que un PATCH debería permitir omitir.
      .optional()
  );
}

/**
 * Definiciones por campo, reutilizadas por el esquema de creacion y el de
 * edicion. Deliberadamente SIN `.default()`: un default dentro de un esquema
 * parcial haría que un PATCH que no menciona `quantity` la reiniciara a 1.
 */
const fields = {
  brand_id: z.uuid('Selecciona un fabricante válido'),

  model: z
    .string()
    .trim()
    .min(CAR_LIMITS.model.min, 'El modelo es obligatorio')
    .max(CAR_LIMITS.model.max, `El modelo no puede superar ${CAR_LIMITS.model.max} caracteres`),

  vehicle_make: optionalText(CAR_LIMITS.vehicleMake.max, 'La marca del vehículo'),

  year: z
    .number()
    .int('El año debe ser un número entero')
    .min(CAR_LIMITS.year.min, `El año debe ser ${CAR_LIMITS.year.min} o posterior`)
    .refine(
      (value) => value <= maxCarYear(),
      // Se comprueba en cada validación, no al cargar el módulo: un proceso
      // levantado en diciembre debe aceptar el año nuevo sin reiniciarse.
      `El año no puede ser más de ${CAR_LIMITS.year.maxOffsetFromNow} años en el futuro`,
    )
    .nullable()
    .optional(),

  description: optionalText(CAR_LIMITS.description.max, 'La descripción'),

  quantity: z
    .number()
    .int('La cantidad debe ser un número entero')
    .min(CAR_LIMITS.quantity.min, `La cantidad debe ser al menos ${CAR_LIMITS.quantity.min}`)
    .max(CAR_LIMITS.quantity.max, `La cantidad no puede superar ${CAR_LIMITS.quantity.max}`),

  is_favorite: z.boolean(),

  /**
   * Ruta del archivo dentro del bucket privado, NO una URL.
   *
   * El cliente la envía después de subir la foto, pero el servidor no se fía:
   * comprueba que sea exactamente `<user_id>/<car_id>.jpg` antes de guardarla.
   * Sin esa comprobación, alguien podria apuntar su auto a la carpeta de otra
   * persona. Ver cars.service.
   */
  image_path: z
    .string()
    .trim()
    .max(255, 'La ruta de la imagen es demasiado larga')
    .nullable()
    .optional(),
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
    image_path: fields.image_path,
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    'Debes enviar al menos un campo para actualizar',
  );

/**
 * Lo que RECIBE el formulario frente a lo que SALE validado.
 *
 * No son lo mismo: `quantity` tiene valor por defecto y el texto vacío se
 * convierte en `null`, así que la entrada admite campos que la salida ya tiene
 * resueltos. React Hook Form necesita los dos tipos por separado.
 */
export type CreateCarFormInput = z.input<typeof createCarSchema>;
export type CreateCarInput = z.infer<typeof createCarSchema>;
export type UpdateCarInput = z.infer<typeof updateCarSchema>;
