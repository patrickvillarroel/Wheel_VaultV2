import * as Linking from 'expo-linking';

/**
 * Direcciones a las que Supabase devuelve al usuario desde un correo.
 *
 * Se construyen con `Linking.createURL` y no a mano: el resultado cambia segun
 * donde corra la app —`wheelvault://` en una compilacion real, `exp://host:port`
 * bajo el servidor de desarrollo— y escribirlas literales solo funciona en uno
 * de los dos casos.
 *
 * IMPORTANTE: cada una de estas direcciones tiene que estar dada de alta en el
 * panel de Supabase, en Authentication > URL Configuration > Redirect URLs. Si
 * no lo esta, Supabase ignora el `redirect_to` y manda al Site URL, que es una
 * pagina web: el correo parece funcionar pero nunca abre la app.
 */

/** Donde cae el enlace de "he olvidado mi contraseña". */
export const RESET_PASSWORD_URL = Linking.createURL('/reset-password');

/**
 * Donde cae el enlace de confirmacion de correo.
 *
 * A la raiz y no a una pantalla propia: al llegar ya hay sesion, asi que el
 * gate de rutas lleva a la pantalla de inicio sin que haya que decidir nada.
 */
export const EMAIL_CONFIRMED_URL = Linking.createURL('/');

export interface AuthLinkPayload {
  /** Flujo implicito: los tokens vienen en el fragmento de la URL. */
  accessToken?: string;
  refreshToken?: string;
  /** Flujo PKCE: viene un codigo de un solo uso que hay que canjear. */
  code?: string;
  /** `recovery`, `signup`, `email_change`… Decide a donde ir despues. */
  type?: string;
  /** Presente cuando el enlace caduco o ya se habia usado. */
  errorDescription?: string;
}

/**
 * Saca de una URL entrante lo que haga falta para abrir sesion.
 *
 * Mira el fragmento y la cadena de consulta porque Supabase usa uno u otro
 * segun el flujo: el implicito devuelve los tokens detras de `#` y el PKCE un
 * `?code=`. Revisar los dos evita que la app dependa de una configuracion del
 * panel que puede cambiar sin tocar este codigo.
 *
 * Devuelve `null` si la URL no trae nada de autenticacion, que es el caso
 * normal de cualquier otro enlace profundo.
 */
export function parseAuthLink(url: string): AuthLinkPayload | null {
  // `URL` no esta disponible de forma fiable en Hermes para esquemas
  // personalizados, asi que se parte a mano.
  const [withoutFragment, fragment = ''] = splitOnce(url, '#');
  const [, queryString = ''] = splitOnce(withoutFragment, '?');

  const params = new URLSearchParams(fragment || queryString);

  // Un enlace caducado llega sin tokens pero con el motivo: merece un mensaje,
  // no el silencio de "no era un enlace de sesion".
  const error = params.get('error_description') ?? params.get('error');

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const code = params.get('code');

  if (!accessToken && !code && !error) return null;

  return {
    ...(accessToken ? { accessToken } : {}),
    ...(refreshToken ? { refreshToken } : {}),
    ...(code ? { code } : {}),
    ...(params.get('type') ? { type: params.get('type') as string } : {}),
    ...(error ? { errorDescription: error } : {}),
  };
}

function splitOnce(value: string, separator: string): [string, string?] {
  const index = value.indexOf(separator);

  if (index === -1) return [value];

  return [value.slice(0, index), value.slice(index + separator.length)];
}
