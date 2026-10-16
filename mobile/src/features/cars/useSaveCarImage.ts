import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { deleteCarImage, uploadCarImage } from '../../lib/storage';
import { updateCar } from './api';
import { carKeys } from './hooks';

/**
 * Sube la foto de un auto y guarda su ruta en el registro.
 *
 * Son dos pasos porque la ruta incluye el id del auto, que no existe hasta
 * haberlo creado: primero se crea el auto, después se sube la imagen y se
 * actualiza con su ruta.
 *
 * El `user_id` sale de la sesión, no de ningún parámetro: es el mismo que la
 * policy del bucket exige como primera carpeta, y el servidor vuelve a
 * comprobar que la ruta corresponda a ese auto.
 */
export function useSaveCarImage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useCallback(
    async (carId: string, localUri: string): Promise<void> => {
      const userId = session?.user.id;

      if (!userId) {
        throw new Error('No hay sesión activa');
      }

      const path = await uploadCarImage(userId, carId, localUri);
      await updateCar(carId, { image_path: path });

      await queryClient.invalidateQueries({ queryKey: carKeys.all });
      // La URL firmada anterior apunta al archivo viejo si se reemplazó la foto.
      await queryClient.invalidateQueries({ queryKey: ['car-image', path] });
    },
    [session, queryClient],
  );
}

/**
 * Quita la foto de un auto: borra el archivo y limpia la referencia.
 *
 * Primero la referencia y luego el archivo sería peor: si falla el segundo
 * paso queda un archivo huérfano invisible. Al revés, un fallo deja el registro
 * apuntando a algo que no existe, y la tarjeta ya sabe caer a su marcador.
 */
export function useRemoveCarImage() {
  const queryClient = useQueryClient();

  return useCallback(
    async (carId: string, path: string): Promise<void> => {
      await deleteCarImage(path);
      await updateCar(carId, { image_path: null });

      await queryClient.invalidateQueries({ queryKey: carKeys.all });
    },
    [queryClient],
  );
}
