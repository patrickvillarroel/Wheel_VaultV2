/**
 * Genera los iconos de la app a partir de un unico archivo fuente.
 *
 *   npm run gen:icons
 *
 * La fuente es `mobile/assets/images/LogotipoB.png`, la version sobre fondo
 * oscuro del logotipo. Todo lo que este script escribe es derivado: si cambia
 * el logotipo, se vuelve a ejecutar y ya esta. No edites los archivos de salida
 * a mano, se sobrescriben.
 *
 * Por que hace falta un script y no basta con apuntar app.json al PNG:
 *
 * - iOS no admite transparencia en el icono. El logotipo tiene las esquinas
 *   redondeadas y por tanto transparentes, asi que hay que aplanarlo contra un
 *   fondo opaco o iOS lo rellena de negro por su cuenta.
 *
 * - El icono adaptativo de Android recorta el primer plano con una mascara que
 *   se come cerca de un 25% por cada lado. Un logotipo a sangre pierde el borde
 *   entero, asi que el primer plano se genera reducido y centrado sobre un
 *   lienzo transparente, dentro de la zona segura.
 */

import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// jimp-compact viene con @expo/image-utils, que ya es dependencia de Expo. Se
// resuelve desde ahi para no anadir una dependencia de imagen al proyecto.
const require = createRequire(import.meta.url);
const Jimp = require(
  require.resolve('jimp-compact', {
    paths: [dirname(require.resolve('@expo/image-utils/package.json'))],
  }),
);

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IMAGES = join(ROOT, 'mobile', 'assets', 'images');
const SOURCE = join(IMAGES, 'LogotipoB.png');

/** Lo que piden App Store y Play Store para el icono principal. */
const ICON_SIZE = 1024;

/**
 * El mismo `backgroundColor` que app.json declara para el splash y el icono
 * adaptativo. Es el negro exacto de la placa del logotipo: con cualquier otro
 * se ve la costura entre el PNG y el fondo que lo rellena.
 */
const BACKGROUND = '#000000';

/**
 * Cuanto del lienzo ocupa el logotipo en el primer plano adaptativo.
 *
 * Android garantiza visible solo el circulo central de 66%. Con 0.62 el
 * logotipo entra entero en cualquiera de las mascaras (circulo, cuadrado
 * redondeado, gota) sin que ninguna le corte una esquina.
 */
const ADAPTIVE_SAFE_RATIO = 0.62;

/** Suficiente para la pestana del navegador en pantallas de alta densidad. */
const FAVICON_SIZE = 64;

async function main() {
  const source = await Jimp.read(SOURCE);

  if (source.bitmap.width !== source.bitmap.height) {
    throw new Error(
      `El logotipo tiene que ser cuadrado y mide ${source.bitmap.width}x${source.bitmap.height}.`,
    );
  }

  if (source.bitmap.width < ICON_SIZE) {
    console.warn(
      `AVISO: la fuente mide ${source.bitmap.width}px y el icono necesita ${ICON_SIZE}px.\n` +
        '       Se escala hacia arriba, asi que los bordes saldran blandos.\n' +
        `       Reexporta ${SOURCE} a ${ICON_SIZE}x${ICON_SIZE} y vuelve a ejecutar esto.`,
    );
  }

  await mkdir(IMAGES, { recursive: true });

  // --- Icono principal: a sangre y sin canal alfa ---
  const icon = new Jimp(ICON_SIZE, ICON_SIZE, BACKGROUND);
  icon.composite(source.clone().resize(ICON_SIZE, ICON_SIZE), 0, 0);
  await write('icon.png', icon);

  // --- Primer plano adaptativo de Android: reducido y centrado ---
  const inner = Math.round(ICON_SIZE * ADAPTIVE_SAFE_RATIO);
  const offset = Math.round((ICON_SIZE - inner) / 2);

  // Lienzo transparente: el color de fondo lo pone app.json, no la imagen.
  const foreground = new Jimp(ICON_SIZE, ICON_SIZE, 0x00000000);
  foreground.composite(source.clone().resize(inner, inner), offset, offset);
  await write('android-icon-foreground.png', foreground);

  // --- Favicon de la version web ---
  await write('favicon.png', source.clone().resize(FAVICON_SIZE, FAVICON_SIZE));

  console.log(`\nHecho. Fuente: ${source.bitmap.width}x${source.bitmap.height}.`);
}

async function write(name, image) {
  const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
  await writeFile(join(IMAGES, name), buffer);
  console.log(`  ${name.padEnd(30)} ${image.bitmap.width}x${image.bitmap.height}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
