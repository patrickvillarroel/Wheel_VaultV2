#!/usr/bin/env node
/**
 * Regenera api/src/types/database.types.ts desde el esquema real de Supabase.
 *
 *     npm run db:types              # contra el proyecto enlazado (supabase link)
 *     npm run db:types -- --local   # contra una instancia local (supabase start)
 *
 * Por que un script y no `supabase gen types ... > archivo`:
 * la redireccion `>` del shell VACIA el archivo ANTES de ejecutar el comando.
 * Si el comando falla —porque la CLI no esta instalada, porque el proyecto no
 * esta enlazado o porque no hay red— te quedas sin el archivo anterior y el
 * proyecto deja de compilar.
 *
 * Aqui la salida se captura en memoria y solo se escribe si el comando termino
 * bien y lo que devolvio parece realmente un archivo de tipos.
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = resolve(projectRoot, 'api/src/types/database.types.ts');

const useLocal = process.argv.includes('--local');
const target = useLocal ? '--local' : '--linked';

const BANNER = `/**
 * GENERADO AUTOMATICAMENTE — no edites este archivo a mano.
 *
 * Fuente: el esquema real de la base de datos de Supabase.
 * Regenerar despues de CADA migracion:
 *
 *     npm run db:types
 */

`;

console.log(`Generando tipos desde Supabase (${target})...`);

// Se pasa el comando como una sola cadena en vez de (comando, [args]) con
// `shell: true`: esa combinacion concatena los argumentos sin escaparlos y Node
// la marca como obsoleta (DEP0190). Aqui no hay entrada del usuario, pero no
// merece la pena mantener el patron inseguro.
const result = spawnSync(`npx --yes supabase gen types typescript ${target}`, {
  cwd: projectRoot,
  encoding: 'utf8',
  shell: true,
  maxBuffer: 20 * 1024 * 1024,
});

if (result.error) {
  console.error(`\nNo se pudo ejecutar la CLI de Supabase: ${result.error.message}`);
  console.error('El archivo anterior se ha dejado intacto.');
  process.exit(1);
}

const stdout = result.stdout ?? '';
const stderr = (result.stderr ?? '').trim();

if (result.status !== 0) {
  console.error('\nLa CLI de Supabase devolvio un error:\n');
  console.error(stderr || '(sin detalle)');

  if (/not linked|no project|link your project/i.test(stderr)) {
    console.error('\nParece que el proyecto no esta enlazado. Ejecuta:');
    console.error('    npx supabase login');
    console.error('    npx supabase link --project-ref TU_PROJECT_REF');
    console.error('\nEl PROJECT_REF esta en la URL del dashboard y en Project Settings > General.');
  }

  console.error('\nEl archivo anterior se ha dejado intacto. Guia: docs/supabase-setup.md');
  process.exit(1);
}

// Comprobacion de cordura: si la CLI devolviera algo vacio o inesperado, mejor
// conservar el archivo que teniamos.
if (!stdout.includes('export type Database') && !stdout.includes('export interface Database')) {
  console.error('\nLa salida de la CLI no parece un archivo de tipos valido.');
  console.error('El archivo anterior se ha dejado intacto. Salida recibida:\n');
  console.error(stdout.slice(0, 500) || '(vacia)');
  process.exit(1);
}

writeFileSync(outputPath, BANNER + stdout.trimStart(), 'utf8');

console.log(`Tipos escritos en api/src/types/database.types.ts (${stdout.length} caracteres).`);
console.log('Recuerda revisar el diff: si cambio algo inesperado, revisa tus migraciones.');
