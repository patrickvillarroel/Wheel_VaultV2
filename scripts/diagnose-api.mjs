#!/usr/bin/env node
/**
 * Localiza por qué una API desplegada devuelve 500 en todo.
 *
 *     npm run diagnose -- https://tu-api.onrender.com
 *
 * No necesita credenciales ni usuarios de prueba: todas las comprobaciones se
 * hacen con tokens inventados. Sirve para diagnosticar un despliegue ajeno o
 * sin tener el .env a mano.
 *
 * La idea: el camino de un request autenticado tiene dos puntos donde puede
 * romperse —verificar el token y hablar con Supabase— y desde fuera los dos se
 * ven igual (un 500). Un token HS256 con firma inválida los separa:
 *
 *   · 401 → la API SÍ pudo comprobar la firma (y rechazarla). El secreto está
 *           configurado y el problema es posterior: la base de datos.
 *   · 500 → la API NO pudo ni intentarlo. Falta SUPABASE_JWT_SECRET.
 */
import { SignJWT } from 'jose';

const baseUrl = (process.argv[2] ?? process.env.API_URL ?? '').replace(/\/+$/, '');

if (!baseUrl) {
  console.error('Falta la URL de la API.\n');
  console.error('  npm run diagnose -- https://tu-api.onrender.com');
  process.exit(1);
}

const results = [];

function report(step, detail) {
  results.push({ step, detail });
  console.log(`  ${step}`);
  if (detail) console.log(`      ${detail}`);
}

async function call(path, token) {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    return { status: response.status, body, raw: text };
  } catch (error) {
    return { status: 0, body: null, raw: error instanceof Error ? error.message : 'error' };
  }
}

console.log(`\nDiagnosticando ${baseUrl}\n`);

// ---------------------------------------------------------------------------
console.log('1. ¿Está viva la API?');

const health = await call('/health');

if (health.status === 0) {
  report('NO responde', health.raw);
  console.log('\nLa URL no contesta. Comprueba que es la correcta y que el');
  console.log('servicio está desplegado. Si es un plan gratuito, puede estar');
  console.log('despertando: espera un minuto y repite.\n');
  process.exit(1);
}

if (health.status !== 200) {
  report(`responde ${health.status} en /health`, 'el servicio arrancó pero algo va mal');
} else {
  report('OK — /health responde 200');
}

// ---------------------------------------------------------------------------
console.log('\n2. ¿Rechaza las peticiones sin token?');

const sinToken = await call('/api/v1/me');
report(
  sinToken.status === 401 ? 'OK — 401 sin token' : `INESPERADO — recibido ${sinToken.status}`,
  sinToken.body?.error?.code,
);

// ---------------------------------------------------------------------------
console.log('\n3. ¿Rechaza un token que no es un token?');

const basura = await call('/api/v1/me', 'esto-no-es-un-token');
report(
  basura.status === 401 ? 'OK — 401 con basura' : `INESPERADO — recibido ${basura.status}`,
  basura.body?.error?.code,
);

// ---------------------------------------------------------------------------
console.log('\n4. ¿Puede comprobar la firma de un token HS256?');

const falso = await new SignJWT({ email: 'diagnostico@example.test' })
  .setProtectedHeader({ alg: 'HS256' })
  .setIssuer(`${baseUrl}/auth/v1`)
  .setAudience('authenticated')
  .setSubject('00000000-0000-4000-8000-000000000000')
  .setIssuedAt()
  .setExpirationTime('5m')
  .sign(new TextEncoder().encode('clave-inventada-para-el-diagnostico-1234567890'));

const firma = await call('/api/v1/me', falso);

console.log(`\n${'='.repeat(60)}`);

if (firma.status === 401) {
  console.log(' EL TOKEN SE VERIFICA BIEN — el problema está en la base de datos');
  console.log('='.repeat(60));
  console.log('');
  console.log('La API comprobó la firma y la rechazó, que es lo correcto. Es decir,');
  console.log('SUPABASE_JWT_SECRET está bien configurada.');
  console.log('');
  console.log('Entonces el 500 ocurre después, al consultar Supabase. Las causas');
  console.log('habituales, por orden de probabilidad:');
  console.log('');
  console.log('  · SUPABASE_ANON_KEY mal copiada (truncada, con espacios o un');
  console.log('    salto de línea al final)');
  console.log('  · SUPABASE_URL de otro proyecto, o con una barra final de más');
  console.log('  · Las migraciones no se aplicaron en ESE proyecto de Supabase');
  console.log('');
  console.log('El arranque de la API comprueba las dos primeras y lo dice con un');
  console.log('FATAL en los logs. Mira las primeras líneas del despliegue.');
} else if (firma.status === 500) {
  console.log(' NO PUEDE VERIFICAR TOKENS — falta SUPABASE_JWT_SECRET');
  console.log('='.repeat(60));
  console.log('');
  console.log('La API ni siquiera llegó a comprobar la firma: devolvió 500 antes.');
  console.log('Eso solo pasa cuando el token viene firmado con HS256 y la');
  console.log('variable SUPABASE_JWT_SECRET no está puesta.');
  console.log('');
  console.log('Si crees que ya la pusiste, comprueba en el panel del hosting:');
  console.log('');
  console.log('  · que el nombre sea exactamente SUPABASE_JWT_SECRET');
  console.log('  · que el valor no esté vacío');
  console.log('  · que el servicio se haya REDESPLEGADO después de añadirla');
  console.log('    (algunos hostings solo la aplican en el siguiente arranque)');
  if (firma.body?.request_id) {
    console.log('');
    console.log(`Para buscarlo en los logs:  ${firma.body.request_id}`);
  }
} else {
  console.log(` RESPUESTA INESPERADA — ${firma.status}`);
  console.log('='.repeat(60));
  console.log('');
  console.log('Se esperaba 401 (firma rechazada) o 500 (no puede verificar).');
  console.log('Respuesta recibida:');
  console.log('');
  console.log(firma.raw.slice(0, 500));
}

console.log('');
