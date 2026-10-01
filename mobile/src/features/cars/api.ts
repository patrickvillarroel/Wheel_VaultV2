import type { CreateCarInput, UpdateCarInput } from '@wheel-vault/shared';
import { api, type Paginated } from '../../lib/apiClient';

/** Un auto tal y como lo devuelve la API (ver docs/api.md). */
export interface Car {
  id: string;
  model: string;
  vehicle_make: string | null;
  year: number | null;
  description: string | null;
  quantity: number;
  is_favorite: boolean;
  image_path: string | null;
  created_at: string;
  updated_at: string;
  brand: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
  } | null;
}

export interface ListCarsParams {
  limit?: number;
  cursor?: string | undefined;
  brandId?: string | undefined;
  search?: string | undefined;
  sort?: 'recent' | 'oldest';
}

function toQueryString(params: ListCarsParams): string {
  const query = new URLSearchParams();

  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.cursor) query.set('cursor', params.cursor);
  if (params.brandId) query.set('brand_id', params.brandId);
  if (params.search) query.set('q', params.search);
  if (params.sort) query.set('sort', params.sort);

  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export function listCars(params: ListCarsParams = {}): Promise<Paginated<Car>> {
  return api.paginated<Car>(`/cars${toQueryString(params)}`);
}

export function getCar(id: string): Promise<Car> {
  return api.get<Car>(`/cars/${id}`);
}

export function createCar(input: CreateCarInput): Promise<Car> {
  return api.post<Car>('/cars', input);
}

export function updateCar(id: string, input: UpdateCarInput): Promise<Car> {
  return api.patch<Car>(`/cars/${id}`, input);
}

export function deleteCar(id: string): Promise<void> {
  return api.delete(`/cars/${id}`);
}

/** Autos de una marca concreta. Mismo contrato de paginación que /cars. */
export function listBrandCars(
  brandId: string,
  params: Omit<ListCarsParams, 'brandId'> = {},
): Promise<Paginated<Car>> {
  return api.paginated<Car>(`/brands/${brandId}/cars${toQueryString(params)}`);
}
