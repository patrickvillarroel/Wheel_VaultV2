import { useQuery } from '@tanstack/react-query';
import { getMe, type Me } from './api';

/** Clave de cache del perfil. Se invalida al editarlo (fase 9). */
export const meQueryKey = ['me'] as const;

export function useMe() {
  return useQuery<Me>({
    queryKey: meQueryKey,
    queryFn: getMe,
  });
}
