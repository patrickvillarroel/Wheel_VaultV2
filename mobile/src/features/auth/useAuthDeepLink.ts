import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { parseAuthLink } from './deepLinks';

/**
 * Abre la sesion que viene dentro de un enlace de correo.
 *
 * En web el SDK de Supabase hace esto solo (`detectSessionInUrl`), pero en
 * nativo esa opcion esta apagada a proposito —no hay barra de direcciones— y
 * sin esto el enlace abre la app y no pasa nada mas: la pantalla de cambiar
 * contraseña se encuentra sin sesion y muestra "enlace no valido".
 *
 * Cubre los dos flujos de Supabase sin depender de como este configurado el
 * proyecto: si llegan tokens, se instalan; si llega un codigo PKCE, se canjea.
 *
 * Se monta una sola vez, en el layout raiz. `useURL` devuelve tanto la URL con
 * la que arranco la app como las que lleguen despues con la app abierta.
 *
 * Devuelve si hay un enlace a medio procesar, para que quien lo monte pueda
 * tapar ese hueco: instalar la sesion es una llamada de red, y sin esperarla
 * la pantalla de recuperar contraseña se pinta un instante con su mensaje de
 * "enlace no valido" antes de recibir la sesion que la hace valida.
 */
export function useAuthDeepLink(): { isProcessing: boolean } {
  const url = Linking.useURL();
  const router = useRouter();

  /** La ultima URL ya resuelta, con exito o sin el. */
  const [settledUrl, setSettledUrl] = useState<string | null>(null);

  /**
   * La que se esta resolviendo ahora mismo.
   *
   * Es una referencia y no estado porque solo sirve para no empezar dos veces
   * el mismo trabajo, y un codigo PKCE es de un solo uso: canjearlo dos veces
   * falla y tumbaria la sesion que acaba de abrirse.
   */
  const inFlight = useRef<string | null>(null);

  // En useMemo para que no sea un objeto nuevo en cada render: si lo fuera,
  // seria una dependencia distinta cada vez y el efecto no pararia.
  const payload = useMemo(() => (url ? parseAuthLink(url) : null), [url]);

  // Derivado del render, no de un setState dentro del efecto: hay un enlace de
  // sesion en la URL y todavia no se ha terminado de resolver.
  const isProcessing = payload !== null && settledUrl !== url;

  useEffect(() => {
    if (!url || !payload) return;
    if (settledUrl === url || inFlight.current === url) return;

    inFlight.current = url;

    void (async () => {
      try {
        if (payload.errorDescription) {
          // No se navega: la pantalla a la que apunta el enlace ya explica que
          // hay que pedir otro. Insistir con una alerta encima seria redundante.
          return;
        }

        if (payload.accessToken && payload.refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: payload.accessToken,
            refresh_token: payload.refreshToken,
          });

          if (error) return;
        } else if (payload.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(payload.code);

          if (error) return;
        } else {
          return;
        }

        // `recovery` es el unico que necesita una pantalla concreta. El resto
        // —confirmar correo, cambiar de direccion— solo necesitan la sesion: el
        // gate de rutas se encarga de llevar a la pantalla de inicio.
        if (payload.type === 'recovery') {
          router.replace('/reset-password');
        }
      } finally {
        // En `finally` y no al final del try: si algo falla, dejar esto sin
        // marcar mantendria el splash puesto para siempre.
        inFlight.current = null;
        setSettledUrl(url);
      }
    })();
  }, [url, payload, settledUrl, router]);

  return { isProcessing };
}
