/**
 * Auditoria de dependencias para CI.
 *
 *   npm run audit:deps
 *
 * Hace lo que hacia `npm audit --audit-level=high`, mas una cosa que npm no
 * sabe hacer: aceptar avisos concretos, por escrito y con motivo.
 *
 * Por que hace falta. A veces se publica un aviso contra la ULTIMA version de
 * un paquete, de modo que no hay a donde actualizar. Cuando ademas llega por
 * una dependencia transitiva del toolchain, las opciones de `npm audit` son
 * dos y las dos malas: dejar CI en rojo indefinidamente —y un CI siempre rojo
 * se deja de leer, que es peor que no tenerlo— o bajar el umbral y perder de
 * vista todo lo que venga despues.
 *
 * Esto permite una tercera: aceptar ESTE aviso, con su motivo, y seguir
 * fallando con cualquier otro. Si manana aparece un fallo de verdad, CI lo
 * canta igual.
 *
 * Y avisa cuando un aviso aceptado ya no aparece, para que la lista se limpie
 * sola en vez de crecer para siempre.
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';

/**
 * `exec` y no `execFile`: en Windows npm es un `.cmd` y desde Node 20 lanzarlo
 * sin shell da EINVAL, pero pasar argumentos sueltos CON shell esta marcado
 * como obsoleto. `exec` recibe la orden entera como texto y resuelve ambas.
 * La orden es una constante, no se interpola nada en ella.
 */
const run = promisify(exec);

/** A partir de que gravedad se falla. Ver docs/security.md. */
const FAIL_FROM = ['high', 'critical'];

/**
 * Avisos aceptados a conciencia.
 *
 * Para añadir uno hay que poder responder a `reason`: por que no se puede
 * arreglar y por que no nos afecta. Si no hay respuesta, no se acepta.
 */
const ACCEPTED = {
  'GHSA-vfj7-8cjw-p6xm': {
    package: 'braces',
    reason:
      'No hay version corregida: 3.0.3 es la ultima publicada y es la señalada. ' +
      'Llega por micromatch dentro de @expo/metro-file-map, que es el empaquetador: ' +
      'corre en nuestra maquina al compilar, no en el telefono de nadie. Explotarlo ' +
      'exigiria controlar los patrones glob de nuestra propia configuracion de build.',
  },
  'GHSA-86w9-cpqp-85rv': {
    package: 'node-forge',
    reason:
      'No hay version corregida: 1.4.0 es la ultima publicada y es la señalada. ' +
      'Llega por @expo/code-signing-certificates (expo-updates) y por @expo/cli. ' +
      'No firmamos actualizaciones OTA, asi que la ruta vulnerable no se ejecuta.',
  },
};

async function main() {
  // `npm audit` sale con codigo 1 cuando encuentra algo, y execFile lo trata
  // como fallo: el informe viene en stdout igualmente.
  const report = await run('npm audit --json', { maxBuffer: 32 * 1024 * 1024 })
    .then((result) => result.stdout)
    .catch((error) => {
      if (!error.stdout) throw error;
      return error.stdout;
    });

  const { vulnerabilities = {} } = JSON.parse(report);

  const found = new Map();

  for (const entry of Object.values(vulnerabilities)) {
    for (const via of entry.via) {
      if (typeof via !== 'object') continue;
      if (!FAIL_FROM.includes(via.severity)) continue;

      const id = identifier(via.url);

      if (!found.has(id)) {
        found.set(id, { id, title: via.title, severity: via.severity, url: via.url });
      }
    }
  }

  const blocking = [...found.values()].filter((item) => !(item.id in ACCEPTED));
  const stale = Object.keys(ACCEPTED).filter((id) => !found.has(id));

  for (const [id, note] of Object.entries(ACCEPTED)) {
    if (found.has(id)) console.log(`· Aceptado: ${note.package} (${id})`);
  }

  if (stale.length > 0) {
    console.log(
      `\nYa no aparecen, quitalos de ACCEPTED en ${import.meta.url.split('/').pop()}:\n` +
        stale.map((id) => `  ${id} (${ACCEPTED[id].package})`).join('\n'),
    );
  }

  if (blocking.length === 0) {
    console.log(`\nSin avisos ${FAIL_FROM.join(' ni ')} sin aceptar.`);
    return;
  }

  console.error(`\n${blocking.length} aviso(s) que hay que atender:\n`);

  for (const item of blocking) {
    console.error(`  [${item.severity}] ${item.title}`);
    console.error(`  ${item.url}\n`);
  }

  console.error(
    'Actualiza la dependencia. Si no hay version corregida y no nos afecta,\n' +
      'añadelo a ACCEPTED en scripts/audit-deps.mjs con su motivo.',
  );

  process.exit(1);
}

/** El GHSA-… del final de la URL del aviso, que es su identificador estable. */
function identifier(url) {
  return url?.split('/').pop() ?? url;
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
