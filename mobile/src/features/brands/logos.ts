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
 * Formato: PNG con fondo transparente. Muchos logotipos de marca son oscuros
 * y la app tiene fondo negro, así que conviene la versión en blanco o en color
 * claro cuando exista.
 *
 * El tamaño NO lo cuides a mano: deja el archivo como lo tengas y ejecuta
 * `npm run optimize:logos`, que reduce todo a 360 px de lado. No es cosmético.
 * La tarjeta mide 112 pt, pero un PNG se descomprime entero en memoria —`ancho
 * x alto x 4` bytes— se dibuje al tamaño que se dibuje. Treinta logotipos a
 * 2000 px eran 119 MB de mapas de bits y el carrusel iba a tirones.
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
  'auto-world': require('../../../assets/images/brands/auto-world.png'),
  greenlight: require('../../../assets/images/brands/greenlight.png'),
  inno64: require('../../../assets/images/brands/inno64.png'),
  schuco: require('../../../assets/images/brands/schuco.png'),
  'm2-machines': require('../../../assets/images/brands/m2-machines.png'),
  'jada-toys': require('../../../assets/images/brands/jada.png'),
  kyosho: require('../../../assets/images/brands/kyosho.png'),
  minichamps: require('../../../assets/images/brands/minichamps.png'),
  motormax: require('../../../assets/images/brands/motor-max.png'),
  autoart: require('../../../assets/images/brands/autoart.png'),
  'ixo-models': require('../../../assets/images/brands/ixo-models.png'),
  'johnny-lightning': require('../../../assets/images/brands/johnny-lightning.png'),
  kinsmart: require('../../../assets/images/brands/kinsmart.png'),
  norev: require('../../../assets/images/brands/norev.png'),
  'pop-race': require('../../../assets/images/brands/pop-race.png'),
  'racing-champions': require('../../../assets/images/brands/racing-champions.png'),
  revell: require('../../../assets/images/brands/revell.png'),
  siku: require('../../../assets/images/brands/siku.png'),
  solido: require('../../../assets/images/brands/solido.png'),
  'spark-model': require('../../../assets/images/brands/spark.png'),
  'tarmac-works': require('../../../assets/images/brands/tarmac.png'),
  tomica: require('../../../assets/images/brands/tomica.png'),
  welly: require('../../../assets/images/brands/welly.png'),
  majorette: require('../../../assets/images/brands/majorette.png'),
  otro: require('../../../assets/images/brands/other.png'),
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
