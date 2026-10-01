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
        if (error instanceof ApiError) {
          // Un 4xx no va a cambiar por insistir.
          if (error.status >= 400 && error.status < 500) return false;

          // Un fallo de red sí puede ser pasajero, pero cada intento consume el
          // timeout completo: con tres, la pantalla tarda más de medio minuto
          // en decir qué pasó. Uno de más es suficiente.
          if (error.code === 'NETWORK_ERROR') return failureCount < 1;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
