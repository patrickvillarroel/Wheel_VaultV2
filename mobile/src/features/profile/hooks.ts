import type { UpdateProfileInput } from '@wheel-vault/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as profileApi from './api';
import type { Me, Profile } from './api';

/** Clave de cache del perfil. */
export const meQueryKey = ['me'] as const;

export function useMe() {
  return useQuery<Me>({
    queryKey: meQueryKey,
    queryFn: profileApi.getMe,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProfileInput) => profileApi.updateProfile(input),

    onSuccess: (profile: Profile) => {
      // Se escribe el resultado del servidor en el cache en lugar de invalidar:
      // el nombre aparece actualizado en cuanto se cierra el formulario, sin
      // esperar una segunda petición.
      queryClient.setQueryData<Me>(meQueryKey, (previous) =>
        previous ? { ...previous, profile } : previous,
      );
    },
  });
}
