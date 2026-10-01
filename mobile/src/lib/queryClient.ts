import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './apiClient';

/**
 * Cache de datos del servidor.
 *
 * Reintentar un 401, un 404 o un 422 no tiene sentido: el resultado sera el
 * mismo y solo retrasa el mensaje de error que el usuario necesita ver.
 * Solo se reintentan los fallos que pueden ser transitorios (red, 5xx).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
