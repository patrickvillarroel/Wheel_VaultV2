#!/usr/bin/env node
/**
 * Busca secretos en lo que está versionado.
 *
 *     npm run check:secrets
 *
 * Solo mira archivos que Git ya rastrea: lo que está en .gitignore no puede
 * filtrarse a GitHub, y escanear node_modules sería lento e inútil.
 *
 * No pretende ser un detector exhaustivo. Cubre lo que de verdad se escapa en
 * este proyecto: una service_role key pegada en el código, un .env versionado
 * por descuido o una clave privada.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PATTERNS = [
  {
    name: 'JWT (posible service_role o access token)',
    // Tres bloques base64url separados por puntos, empezando por el header
    // típico de un JWT. El primero suele ser `eyJ` ({"alg"... en base64).
    regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  },
  {
    name: 'Clave privada',
    regex: /-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/,
  },
  {
    name: 'service_role con valor asignado',
    regex: /SERVICE_ROLE_KEY\s*[=:]\s*["']?[A-Za-z0-9._-]{20,}/,
  },
  {
    name: 'JWT secret con valor asignado',
    regex: /JWT_SECRET\s*[=:]\s*["']?[A-Za-z0-9._-]{20,}/,
  },
];

/**
 * Archivos donde un "secreto" es en realidad un ejemplo o un valor de prueba.
 * Se excluyen a propósito para que el chequeo no grite cada vez.
 */
const ALLOWED = [
  /\.env\.example$/,
  /^api\/tests\//,
  /^scripts\/check-secrets\.mjs$/,
  /^docs\//,
  /package-lock\.json$/,
];

/**
 * Marca para silenciar una linea concreta.
 *
 * Se prefiere a excluir el archivo entero: deja constancia de por que ese valor
 * no es un secreto, y cualquier otro que aparezca despues en el mismo archivo
 * si salta.
 */
const ALLOW_MARKER = 'check-secrets:permitido';

function tracked() {
  const output = execFileSync('git', ['ls-files'], { encoding: 'utf8' });
  return output.split(/\r?\n/).filter(Boolean);
}

const findings = [];
let scanned = 0;

for (const file of tracked()) {
  // Un .env versionado es un hallazgo por si mismo, sin mirar su contenido.
  if (/(^|\/)\.env(\.|$)/.test(file) && !/\.env\.example$/.test(file)) {
    findings.push({ file, line: 0, name: 'Archivo .env versionado' });
    continue;
  }

  if (ALLOWED.some((pattern) => pattern.test(file))) continue;

  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    // Binario o ilegible: no hay texto que revisar.
    continue;
  }

  scanned += 1;

  const lines = content.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    // La marca vale en la propia linea o en la anterior, para poder dejarla
    // como comentario encima y explicar por que ese valor no es un secreto.
    const allowed =
      line.includes(ALLOW_MARKER) || (lines[index - 1]?.includes(ALLOW_MARKER) ?? false);

    if (allowed) continue;

    for (const pattern of PATTERNS) {
      if (pattern.regex.test(line)) {
        findings.push({ file, line: index + 1, name: pattern.name });
      }
    }
  }
}

if (findings.length === 0) {
  console.log(`Sin secretos detectados (${scanned} archivos revisados).`);
  process.exit(0);
}

console.error(`\nPosibles secretos en ${findings.length} sitio(s):\n`);
for (const finding of findings) {
  const where = finding.line > 0 ? `${finding.file}:${finding.line}` : finding.file;
  console.error(`  ${where}`);
  console.error(`    ${finding.name}\n`);
}
console.error('Si alguno ya llegó a un commit, rotalo en Supabase: borrarlo del');
console.error('codigo no lo saca del historial de Git.\n');
process.exit(1);
