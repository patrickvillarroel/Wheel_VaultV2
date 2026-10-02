/**
 * Logotipos de las marcas del catálogo, incluidos en la app.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * CÓMO AÑADIR UN LOGOTIPO
 *
 *   1. Deja el archivo en `mobile/assets/images/brands/<slug>.png`, con el
 *      mismo slug que la marca tiene en la base de datos. Los slugs están en
 *      la migración `20260930120200_brands.sql`, y también los devuelve
 *      `GET /api/v1/brands`.
 *   2. Añade su línea a `LOGOS`, aquí abajo.
 *
 * El segundo paso no se puede evitar: Metro resuelve los `require()` en tiempo
 * de compilación para poder empaquetar el archivo, así que una ruta construida
 * al vuelo —`require(\`...\${slug}.png\`)`— no funciona.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Por qué van en la app y no en Storage: el catálogo es global, fijo y se
 * siembra con una migración, de modo que ampliarlo ya implica publicar una
 * versión nueva. A cambio los logotipos aparecen al instante y sin conexión,
 * que es lo que necesita un carrusel en la pantalla de inicio.
 *
 * `brands.logo_url` sigue existiendo y tiene prioridad sobre esta tabla: es la
 * vía para las marcas que cree un usuario (ADR-003), que sí viven en Storage.
 *
 * Formato recomendado: PNG con fondo transparente, unos 300 px de ancho.
 * Muchos logotipos de marca son oscuros y la app tiene fondo negro, así que
 * conviene la versión en blanco o en color claro cuando exista.
 */

/** Claves = `slug` de la marca. Si falta una, la tarjeta muestra el nombre. */
const LOGOS: Record<string, number> = {
  // Descomenta cada línea según vayas dejando el archivo correspondiente.
  //
  'hot-wheels': require('../../../assets/images/brands/hot-wheels.png'),
  matchbox: require('../../../assets/images/brands/matchbox.png'),
  maisto: require('../../../assets/images/brands/maisto.png'),
  bburago: require('../../../assets/images/brands/bburago.png'),
  'mini-gt': require('../../../assets/images/brands/mini-gt.png'),
};

/**
 * El logotipo de una marca, si lo hay.
 *
 * Orden de preferencia:
 *   1. `logo_url` que venga de la API — así una marca privada de un usuario, o
 *      una corrección puntual, no depende de publicar la app.
 *   2. El archivo incluido en la app, por slug.
 *   3. Nada: la tarjeta cae al nombre en texto.
 */
export function getBrandLogo(
  slug: string,
  logoUrl: string | null,
): { uri: string } | number | null {
  if (logoUrl) return { uri: logoUrl };

  return LOGOS[slug] ?? null;
}
