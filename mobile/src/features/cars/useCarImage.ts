import { useQuery } from '@tanstack/react-query';
import { getSignedUrls } from '../../lib/storage';

/**
 * URL firmada para la foto de un auto.
 *
 * El bucket es privado, así que cada imagen necesita una URL temporal. Se
 * cachea casi tanto como dura la firma (una hora) para no pedir una nueva en
 * cada scroll de la lista; se renueva poco antes de caducar.
 */
const SIGNED_URL_TTL_SECONDS = 3600;
const STALE_TIME = 50 * 60 * 1000;

/**
 * Ventana en la que se juntan las peticiones de firma antes de salir a la red.
 *
 * Al desplazar una lista, FlashList monta varias tarjetas en el mismo frame y
 * cada una pide su URL por separado. Esperar un suspiro las agrupa en una sola
 * peticion. Tiene que ser corto: es tiempo que la primera foto tarda de mas.
 */
const BATCH_WINDOW_MS = 40;

/**
 * Techo por peticion.
 *
 * Las rutas viajan en el cuerpo y una lista sin limite acabaria dando un 413
 * en una colección grande. Al llegar al tope se cierra el lote y el siguiente
 * se va en otra peticion.
 */
const MAX_BATCH = 80;

type Resolver = (url: string | null) => void;

/**
 * Rutas esperando a salir, con quien espera cada una.
 *
 * Es un array por ruta y no un solo resolver porque dos tarjetas pueden pedir
 * la misma foto en el mismo frame —ocurre al volver atras en la lista— y las
 * dos tienen que recibir respuesta.
 */
let pending = new Map<string, Resolver[]>();
let timer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  const batch = pending;

  pending = new Map();
  timer = null;

  if (batch.size === 0) return;

  const paths = [...batch.keys()];

  try {
    const urls = await getSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

    for (const [path, resolvers] of batch) {
      const url = urls.get(path) ?? null;
      for (const resolve of resolvers) resolve(url);
    }
  } catch {
    // Nadie puede quedarse esperando: sin foto la tarjeta pinta su marcador,
    // pero una promesa sin resolver deja la query cargando para siempre.
    for (const resolvers of batch.values()) {
      for (const resolve of resolvers) resolve(null);
    }
  }
}

/** Encola una ruta y devuelve su URL cuando salga el lote al que le toque. */
function requestSignedUrl(path: string): Promise<string | null> {
  return new Promise((resolve) => {
    const waiting = pending.get(path);

    if (waiting) {
      waiting.push(resolve);
    } else {
      pending.set(path, [resolve]);
    }

    if (pending.size >= MAX_BATCH) {
      if (timer) clearTimeout(timer);
      void flush();
      return;
    }

    timer ??= setTimeout(() => void flush(), BATCH_WINDOW_MS);
  });
}

export function useCarImageUrl(path: string | null) {
  return useQuery<string | null>({
    // La clave sigue siendo por ruta: el lote es un detalle del transporte, y
    // la cache tiene que poder responder a una foto suelta sin pedir nada.
    queryKey: ['car-image', path],
    queryFn: () => requestSignedUrl(path as string),
    enabled: path !== null,
    staleTime: STALE_TIME,
    gcTime: STALE_TIME + 5 * 60 * 1000,
    // Que falte una foto no es un error que merezca reintentos ni molestar al
    // usuario: la tarjeta cae a su marcador y la pantalla sigue funcionando.
    retry: false,
  });
}
