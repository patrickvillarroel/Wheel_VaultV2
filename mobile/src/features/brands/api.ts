import { api } from '../../lib/apiClient';

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  /** Cuántos autos tiene EL USUARIO de esta marca (ADR-003). */
  car_count: number;
}

export function listBrands(search?: string): Promise<Brand[]> {
  const query = search ? `?q=${encodeURIComponent(search)}` : '';
  return api.get<Brand[]>(`/brands${query}`);
}

export function getBrand(id: string): Promise<Brand> {
  return api.get<Brand>(`/brands/${id}`);
}
