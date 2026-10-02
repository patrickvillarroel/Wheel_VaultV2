import type { DbClient } from '../../config/supabase.js';
import * as brandsRepository from '../brands/brands.repository.js';
import * as carsRepository from '../cars/cars.repository.js';
import type { Car } from '../cars/cars.service.js';

/** Cuántos autos recientes se muestran en el carrusel de la pantalla de inicio. */
const RECENT_LIMIT = 8;

export interface CollectionSummary {
  total_cars: number;
  /** Marcas de las que el usuario tiene al menos un auto, no el catálogo entero. */
  total_brands: number;
  recent: Car[];
}

/**
 * Resumen de la colección para la pantalla de inicio.
 *
 * Va en un solo endpoint a propósito: la Home necesitaría tres peticiones por
 * separado y en el arranque de la app eso se nota, sobre todo con red móvil.
 *
 * Las tres consultas se lanzan a la vez porque no dependen entre sí; en serie
 * sumarían sus latencias sin ganar nada.
 */
export async function getSummary(db: DbClient, userId: string): Promise<CollectionSummary> {
  const [totalCars, brands, recent] = await Promise.all([
    carsRepository.countForUser(db, userId),
    brandsRepository.listVisible(db),
    carsRepository.list(db, userId, {
      ascending: false,
      limit: RECENT_LIMIT,
    }),
  ]);

  // El conteo por marca ya viene filtrado por la RLS de `cars`, así que basta
  // con quedarse con las que tienen algo. Pedir un COUNT DISTINCT aparte
  // costaría otra consulta para el mismo dato.
  const total_brands = brands.filter((brand) => (brand.cars[0]?.count ?? 0) > 0).length;

  return {
    total_cars: totalCars,
    total_brands,
    recent,
  };
}
