import { ERROR_CODES } from '@wheel-vault/shared';
import type { DbClient } from '../../config/supabase.js';
import { AppError } from '../../shared/errors/AppError.js';
import type { Page } from '../../shared/pagination.js';
import * as carsService from '../cars/cars.service.js';
import type { Car } from '../cars/cars.service.js';
import * as brandsRepository from './brands.repository.js';
import type { BrandRow } from './brands.repository.js';
import type { BrandCarsQuery } from './brands.schema.js';

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  /** Cuantos autos TIENE EL USUARIO de esta marca. Ver ADR-003. */
  car_count: number;
}

/**
 * El conteo incrustado llega como `cars: [{ count: n }]`. PostgREST devuelve el
 * array vacio cuando no hay filas que contar, asi que ausencia equivale a cero.
 */
function toBrand(row: BrandRow): Brand {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    logo_url: row.logo_url,
    car_count: row.cars[0]?.count ?? 0,
  };
}

export async function listBrands(db: DbClient, search?: string): Promise<Brand[]> {
  const rows = await brandsRepository.listVisible(db, search);

  return rows.map(toBrand);
}

export async function getBrand(db: DbClient, brandId: string): Promise<Brand> {
  const row = await brandsRepository.findById(db, brandId);

  if (!row) {
    throw AppError.notFound(ERROR_CODES.BRAND_NOT_FOUND, 'No se encontro el fabricante');
  }

  return toBrand(row);
}

/**
 * Los autos del usuario de una marca concreta.
 *
 * Se comprueba primero que la marca exista para poder distinguir "esa marca no
 * existe" (404) de "esa marca existe pero no tienes autos suyos" (200 con lista
 * vacia). Sin la comprobacion, los dos casos devolverian lo mismo y la pantalla
 * no podria mostrar un mensaje util.
 *
 * El listado lo resuelve el servicio de autos: el contrato de paginacion y el
 * filtrado por user_id ya viven alli y no tiene sentido duplicarlos.
 */
export async function listBrandCars(
  db: DbClient,
  userId: string,
  brandId: string,
  query: BrandCarsQuery,
): Promise<Page<Car>> {
  await getBrand(db, brandId);

  return carsService.listCars(db, userId, {
    ...query,
    brand_id: brandId,
    // Esta pantalla no busca por modelo; filtra solo por marca.
    q: undefined,
  });
}
