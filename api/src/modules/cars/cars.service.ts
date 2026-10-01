import { ERROR_CODES, type CreateCarInput, type UpdateCarInput } from '@wheel-vault/shared';
import type { DbClient } from '../../config/supabase.js';
import { AppError } from '../../shared/errors/AppError.js';
import { buildPage, decodeCursor, type Page } from '../../shared/pagination.js';
import * as brandsRepository from '../brands/brands.repository.js';
import * as carsRepository from './cars.repository.js';
import type { CarRow } from './cars.repository.js';
import type { ListCarsQuery } from './cars.schema.js';

/**
 * Reglas de negocio de los autos. No conoce HTTP.
 *
 * `userId` llega SIEMPRE desde el token verificado (req.user.id), nunca desde
 * el cuerpo o la query: por eso es un parametro aparte y no un campo mas de
 * los datos de entrada.
 */

export type Car = CarRow;

export async function listCars(
  db: DbClient,
  userId: string,
  query: ListCarsQuery,
): Promise<Page<Car>> {
  const cursor = query.cursor ? decodeCursor(query.cursor) : undefined;

  // Se pide una fila de mas para saber si hay pagina siguiente sin lanzar un
  // COUNT aparte, que sobre una tabla con RLS es caro.
  const rows = await carsRepository.list(db, userId, {
    brandId: query.brand_id,
    search: query.q,
    ascending: query.sort === 'oldest',
    cursor,
    limit: query.limit + 1,
  });

  return buildPage(rows, query.limit, (row) => ({ createdAt: row.created_at, id: row.id }));
}

export async function getCar(db: DbClient, userId: string, carId: string): Promise<Car> {
  const car = await carsRepository.findById(db, userId, carId);

  if (!car) {
    // 404 y no 403 tambien cuando el auto existe pero es de otra persona: un
    // 403 confirmaria que ese id existe.
    throw AppError.notFound(ERROR_CODES.CAR_NOT_FOUND, 'No se encontro el auto');
  }

  return car;
}

export async function createCar(db: DbClient, userId: string, input: CreateCarInput): Promise<Car> {
  await assertBrandIsVisible(db, input.brand_id);

  return carsRepository.insert(db, {
    // El user_id lo pone el servidor a partir del token. Aunque el cliente
    // enviara uno en el body, Zod ya lo descarto por no estar en el esquema.
    user_id: userId,
    brand_id: input.brand_id,
    model: input.model,
    vehicle_make: input.vehicle_make ?? null,
    year: input.year ?? null,
    description: input.description ?? null,
    quantity: input.quantity,
    is_favorite: input.is_favorite,
  });
}

export async function updateCar(
  db: DbClient,
  userId: string,
  carId: string,
  input: UpdateCarInput,
): Promise<Car> {
  if (input.brand_id !== undefined) {
    await assertBrandIsVisible(db, input.brand_id);
  }

  // Solo viajan a la base de datos los campos realmente enviados. Sin este
  // filtro, un PATCH que no menciona `description` la pondria a NULL: en un
  // PATCH, ausente significa "no lo toques" y null significa "borralo".
  const patch = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );

  const car = await carsRepository.update(db, userId, carId, patch);

  if (!car) {
    throw AppError.notFound(ERROR_CODES.CAR_NOT_FOUND, 'No se encontro el auto');
  }

  return car;
}

export async function deleteCar(db: DbClient, userId: string, carId: string): Promise<void> {
  const deleted = await carsRepository.remove(db, userId, carId);

  if (!deleted) {
    throw AppError.notFound(ERROR_CODES.CAR_NOT_FOUND, 'No se encontro el auto');
  }
}

/**
 * Comprueba que el fabricante existe y el usuario puede verlo.
 *
 * Las claves foraneas se validan a nivel de sistema y no ven la RLS, asi que
 * sin esta comprobacion un usuario podria apuntar su auto a una marca privada
 * de otra persona —acertando el UUID— y quedarse con un auto cuya marca no
 * puede leer.
 */
async function assertBrandIsVisible(db: DbClient, brandId: string): Promise<void> {
  const brand = await brandsRepository.findVisibleById(db, brandId);

  if (!brand) {
    throw AppError.notFound(ERROR_CODES.BRAND_NOT_FOUND, 'El fabricante indicado no existe');
  }
}
