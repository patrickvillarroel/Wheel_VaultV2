import { useQuery } from '@tanstack/react-query';
import { getSignedUrl } from '../../lib/storage';

/**
 * URL firmada para la foto de un auto.
 *
 * El bucket es privado, así que cada imagen necesita una URL temporal. Se
 * cachea casi tanto como dura la firma (una hora) para no pedir una nueva en
 * cada scroll de la lista; se renueva poco antes de caducar.
 */
const SIGNED_URL_TTL_SECONDS = 3600;
const STALE_TIME = 50 * 60 * 1000;

export function useCarImageUrl(path: string | null) {
  return useQuery<string | null>({
    queryKey: ['car-image', path],
    queryFn: () => getSignedUrl(path as string, SIGNED_URL_TTL_SECONDS),
    enabled: path !== null,
    staleTime: STALE_TIME,
    gcTime: STALE_TIME + 5 * 60 * 1000,
    // Que falte una foto no es un error que merezca reintentos ni molestar al
    // usuario: la tarjeta cae a su marcador y la pantalla sigue funcionando.
    retry: false,
  });
}
