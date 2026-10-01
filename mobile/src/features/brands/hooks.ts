import { useQuery } from '@tanstack/react-query';
import * as brandsApi from './api';
import type { Brand } from './api';

export const brandKeys = {
  all: ['brands'] as const,
  list: (search?: string) => [...brandKeys.all, 'list', search ?? ''] as const,
  detail: (id: string) => [...brandKeys.all, 'detail', id] as const,
};

/**
 * El catálogo completo. No pagina y cambia muy poco, así que se mantiene
 * fresco más tiempo que el resto: el selector del formulario lo abre y lo
 * cierra constantemente y no tiene sentido volver a pedirlo cada vez.
 */
export function useBrands(search?: string) {
  return useQuery<Brand[]>({
    queryKey: brandKeys.list(search),
    queryFn: () => brandsApi.listBrands(search),
    staleTime: 5 * 60 * 1000,
  });
}

export function useBrand(id: string) {
  return useQuery<Brand>({
    queryKey: brandKeys.detail(id),
    queryFn: () => brandsApi.getBrand(id),
  });
}
