/**
 * Reduce los logotipos de marca al tamano al que de verdad se dibujan.
 *
 *   npm run optimize:logos
 *
 * Opera sobre `mobile/assets/images/brands/` y SOBRESCRIBE los archivos. Los
 * originales estan en el historial de git si hicieran falta.
 *
 * Por que hace falta: la tarjeta de marca mide 112 pt, asi que en la pantalla
 * mas densa que soportamos (3x) necesita 336 px. Un logotipo de 2000 px no se
 * ve mejor, pero cuesta lo mismo que si se viera: el coste real no es el peso
 * del archivo sino el mapa de bits que sale de descomprimirlo, que son
 * `ancho x alto x 4` bytes en memoria, llegue a dibujarse a 112 pt o a 2000.
 *
 * Solo reduce. Un logotipo que ya este por debajo del objetivo se deja igual,
 * asi que el script se puede ejecutar las veces que haga falta sin degradar
 * nada por reencodings sucesivos.
 */

import { createRequire } from 'node:module';
import { readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const Jimp = require(
  require.resolve('jimp-compact', {
    paths: [dirname(require.resolve('@expo/image-utils/package.json'))],
  }),
);

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BRANDS = join(ROOT, 'mobile', 'assets', 'images', 'brands');

/**
 * Lado maximo, en pixeles.
 *
 * La tarjeta mide 112 pt y `contentFit: 'contain'` escala por el lado largo,
 * que en estos logotipos es el ancho. 360 cubre los 336 que pide una pantalla
 * 3x y deja un margen por si la tarjeta crece.
 */
const MAX_SIDE = 360;

async function main() {
  const files = (await readdir(BRANDS)).filter((f) => extname(f).toLowerCase() === '.png');

  let before = 0;
  let after = 0;
  let pixelsBefore = 0;
  let pixelsAfter = 0;
  let touched = 0;

  for (const file of files.sort()) {
    const path = join(BRANDS, file);
    const originalSize = (await stat(path)).size;
    const image = await Jimp.read(path);

    const { width, height } = image.bitmap;
    before += originalSize;
    pixelsBefore += width * height;

    const longest = Math.max(width, height);

    if (longest <= MAX_SIDE) {
      after += originalSize;
      pixelsAfter += width * height;
      console.log(`  ${file.padEnd(26)} ${width}x${height}  ya estaba bien`);
      continue;
    }

    const ratio = MAX_SIDE / longest;
    image.resize(Math.round(width * ratio), Math.round(height * ratio));

    const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
    await writeFile(path, buffer);

    touched += 1;
    after += buffer.length;
    pixelsAfter += image.bitmap.width * image.bitmap.height;

    console.log(
      `  ${file.padEnd(26)} ${width}x${height} -> ${image.bitmap.width}x${image.bitmap.height}` +
        `  ${kb(originalSize)} -> ${kb(buffer.length)}`,
    );
  }

  console.log(`\n${touched} de ${files.length} archivos reducidos.`);
  console.log(`  En disco:  ${mb(before)} -> ${mb(after)}`);
  // Cuatro bytes por pixel: es lo que ocupa el mapa de bits ya descomprimido.
  console.log(`  En memoria: ${mb(pixelsBefore * 4)} -> ${mb(pixelsAfter * 4)}`);
}

function kb(bytes) {
  return `${Math.round(bytes / 1024)} KB`;
}

function mb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
