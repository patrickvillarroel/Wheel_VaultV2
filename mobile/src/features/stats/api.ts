import { api } from '../../lib/apiClient';
import type { Car } from '../cars/api';

export interface CollectionSummary {
  total_cars: number;
  /** Marcas de las que el usuario tiene algo, no el catálogo entero. */
  total_brands: number;
  recent: Car[];
}

/** Todo lo que necesita la pantalla de inicio, en una sola llamada. */
export function getSummary(): Promise<CollectionSummary> {
  return api.get<CollectionSummary>('/stats/summary');
}
