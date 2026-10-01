import type { CreateCarInput, UpdateCarInput } from '@wheel-vault/shared';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import type { Paginated } from '../../lib/apiClient';
import { brandKeys } from '../brands/hooks';
import * as carsApi from './api';
import type { Car, ListCarsParams } from './api';

/**
 * Claves de cache.
 *
 * Centralizadas para que invalidar no dependa de recordar la forma exacta del
 * array en cada pantalla: un desajuste ahí deja datos obsoletos en pantalla y
 * es de los bugs más molestos de diagnosticar.
 */
export const carKeys = {
  all: ['cars'] as const,
  lists: () => [...carKeys.all, 'list'] as const,
  list: (filters: Omit<ListCarsParams, 'cursor'>) => [...carKeys.lists(), filters] as const,
  details: () => [...carKeys.all, 'detail'] as const,
  detail: (id: string) => [...carKeys.details(), id] as const,
};

const PAGE_SIZE = 20;

export function useCars(filters: Omit<ListCarsParams, 'cursor' | 'limit'> = {}) {
  return useInfiniteQuery<Paginated<Car>>({
    queryKey: carKeys.list(filters),
    queryFn: ({ pageParam }) =>
      carsApi.listCars({
        ...filters,
        limit: PAGE_SIZE,
        cursor: pageParam as string | undefined,
      }),
    initialPageParam: undefined,
    // `undefined` le dice a React Query que no hay más páginas; devolver null
    // haría que siguiera pidiendo.
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useCar(id: string) {
  return useQuery<Car>({
    queryKey: carKeys.detail(id),
    queryFn: () => carsApi.getCar(id),
  });
}

/**
 * Tras crear, editar o borrar hay que invalidar también las marcas: su
 * `car_count` acaba de cambiar y si no, la pantalla de Marcas muestra un número
 * viejo.
 */
function useInvalidateAfterWrite() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: carKeys.lists() });
    void queryClient.invalidateQueries({ queryKey: brandKeys.all });
  };
}

export function useCreateCar() {
  const invalidate = useInvalidateAfterWrite();

  return useMutation({
    mutationFn: (input: CreateCarInput) => carsApi.createCar(input),
    onSuccess: invalidate,
  });
}

export function useUpdateCar(id: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateAfterWrite();

  return useMutation({
    mutationFn: (input: UpdateCarInput) => carsApi.updateCar(id, input),
    onSuccess: (car) => {
      // El detalle se escribe directamente con lo que devolvió el servidor:
      // así la pantalla ya está al día cuando se cierra el formulario, sin
      // esperar a que una refetch termine.
      queryClient.setQueryData(carKeys.detail(id), car);
      invalidate();
    },
  });
}

export function useDeleteCar() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateAfterWrite();

  return useMutation({
    mutationFn: (id: string) => carsApi.deleteCar(id),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: carKeys.detail(id) });
      invalidate();
    },
  });
}

/**
 * Marcar o desmarcar favorito, de forma optimista.
 *
 * Aquí sí compensa: el corazón tiene que responder al instante o la pulsación
 * se siente rota. Si la petición falla se revierte el cambio.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      carsApi.updateCar(id, { is_favorite: isFavorite }),

    onMutate: async ({ id, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: carKeys.all });

      const previousDetail = queryClient.getQueryData<Car>(carKeys.detail(id));
      const previousLists = queryClient.getQueriesData<InfiniteData<Paginated<Car>>>({
        queryKey: carKeys.lists(),
      });

      if (previousDetail) {
        queryClient.setQueryData<Car>(carKeys.detail(id), {
          ...previousDetail,
          is_favorite: isFavorite,
        });
      }

      queryClient.setQueriesData<InfiniteData<Paginated<Car>>>(
        { queryKey: carKeys.lists() },
        (data) =>
          data
            ? {
                ...data,
                pages: data.pages.map((page) => ({
                  ...page,
                  items: page.items.map((car) =>
                    car.id === id ? { ...car, is_favorite: isFavorite } : car,
                  ),
                })),
              }
            : data,
      );

      return { previousDetail, previousLists };
    },

    onError: (_error, { id }, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(carKeys.detail(id), context.previousDetail);
      }
      for (const [key, data] of context?.previousLists ?? []) {
        queryClient.setQueryData(key, data);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: carKeys.lists() });
    },
  });
}
