#!/usr/bin/env node
/**
 * Prueba de humo contra la API y la base de datos REALES.
 *
 *     npm run smoke
 *
 * Recorre el CRUD completo y, sobre todo, comprueba que un usuario no puede
 * leer, modificar ni borrar los datos de otro a traves de la API. Los tests de
 * vitest simulan los repositorios: esto es lo unico que ejercita Postgres.
 *
 * Necesita:
 *   - la API corriendo    (npm run dev:api)
 *   - api/.env relleno
 *   - dos usuarios de prueba creados en Authentication > Users, con
 *     "Auto Confirm User" marcado
 *
 * Las contrasenas se piden por teclado y no se guardan ni se imprimen. Para
 * repetir la prueba sin teclear, exporta SMOKE_A_EMAIL, SMOKE_A_PASSWORD,
 * SMOKE_B_EMAIL y SMOKE_B_PASSWORD.
 *
 * Usa cuentas creadas solo para esto, nunca una cuenta real.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const API_URL = process.env.API_URL ?? 'http://localhost:4000';
// Normalmente api/.env. Se puede apuntar a otro archivo para probar contra un
// entorno distinto sin tocar el de desarrollo.
const ENV_FILE = resolve(projectRoot, process.env.SMOKE_ENV_FILE ?? 'api/.env');

// ---------------------------------------------------------------------------
// Informe
// ---------------------------------------------------------------------------

let passed = 0;
const failures = [];

function check(description, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  OK    ${description}`);
  } else {
    failures.push({ description, detail });
    console.log(`  FALLO ${description}`);
    if (detail) console.log(`        ${detail}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
}

// ---------------------------------------------------------------------------
// Configuracion
// ---------------------------------------------------------------------------

function readEnvFile(path) {
  const values = {};
  let raw;

  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    console.error(`No se encontro ${path}.`);
    console.error('Copia api/.env.example a api/.env y rellena los valores.');
    console.error('Guia: docs/supabase-setup.md');
    process.exit(1);
  }

  for (const line of raw.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (match?.[1]) {
      values[match[1]] = (match[2] ?? '').trim().replace(/^["']|["']$/g, '');
    }
  }

  return values;
}

async function askCredentials(label, emailVar, passwordVar) {
  const email = process.env[emailVar];
  const password = process.env[passwordVar];

  if (email && password) return { email, password };

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const askedEmail = email ?? (await rl.question(`Email del usuario ${label}: `));
    const askedPassword = password ?? (await rl.question(`Contrasena de ${label}: `));
    return { email: askedEmail.trim(), password: askedPassword };
  } finally {
    rl.close();
  }
}

// ---------------------------------------------------------------------------
// Clientes HTTP
// ---------------------------------------------------------------------------

async function signIn(supabaseUrl, anonKey, { email, password }, label) {
  let response;

  try {
    response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch (error) {
    console.error(`\nNo se pudo contactar con Supabase en ${supabaseUrl}.`);
    console.error(`  ${error instanceof Error ? error.message : 'error de red'}`);
    console.error('\nComprueba SUPABASE_URL en api/.env y tu conexion a internet.');
    process.exit(1);
  }

  const body = await response.json().catch(() => ({}));

  if (!response.ok || !body.access_token) {
    console.error(`\nNo se pudo iniciar sesion con el usuario ${label}.`);
    console.error(`  ${body.error_description ?? body.msg ?? `HTTP ${response.status}`}`);
    console.error('\nComprueba que el usuario existe en Authentication > Users y que');
    console.error('esta confirmado (al crearlo, marca "Auto Confirm User").');
    process.exit(1);
  }

  return body.access_token;
}

/** Nunca devuelve ni imprime el token; solo el resultado de la llamada. */
async function api(token, method, path, body) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // Una respuesta que no es JSON (por ejemplo un 502 del proxy) no debe
    // tumbar la prueba: las comprobaciones la trataran como un fallo normal.
    json = null;
  }

  return { status: response.status, body: json, headers: response.headers };
}

// ---------------------------------------------------------------------------
// Prueba
// ---------------------------------------------------------------------------

async function main() {
  const env = readEnvFile(ENV_FILE);
  const supabaseUrl = env['SUPABASE_URL']?.replace(/\/+$/, '');
  const anonKey = env['SUPABASE_ANON_KEY'];

  if (!supabaseUrl || !anonKey) {
    console.error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY en api/.env.');
    process.exit(1);
  }

  console.log(`API:      ${API_URL}`);
  console.log(`Supabase: ${supabaseUrl}\n`);

  // --- la API responde ---
  let health;
  try {
    health = await fetch(`${API_URL}/health`);
  } catch {
    console.error(`No se pudo conectar con ${API_URL}.`);
    console.error('Arranca la API en otra terminal con:  npm run dev:api');
    process.exit(1);
  }

  if (!health.ok) {
    console.error(`La API respondio ${health.status} en /health.`);
    process.exit(1);
  }

  const userA = await askCredentials('A', 'SMOKE_A_EMAIL', 'SMOKE_A_PASSWORD');
  const userB = await askCredentials('B', 'SMOKE_B_EMAIL', 'SMOKE_B_PASSWORD');

  if (userA.email === userB.email) {
    console.error('\nLos dos usuarios deben ser distintos.');
    process.exit(1);
  }

  const tokenA = await signIn(supabaseUrl, anonKey, userA, 'A');
  const tokenB = await signIn(supabaseUrl, anonKey, userB, 'B');

  let carId = null;
  let brandId = null;

  try {
    // -----------------------------------------------------------------------
    section('1. Identidad y perfil');

    const me = await api(tokenA, 'GET', '/api/v1/me');
    check('GET /me responde 200', me.status === 200, `recibido ${me.status}`);
    check(
      'devuelve el perfil creado por el trigger handle_new_user',
      Boolean(me.body?.data?.profile?.display_name),
      'si falta, revisa la migracion de profiles',
    );
    check(
      'el email viene del token, no duplicado en la base de datos',
      me.body?.data?.user?.email === userA.email,
    );

    const sinToken = await fetch(`${API_URL}/api/v1/me`);
    check('sin token responde 401', sinToken.status === 401);

    // -----------------------------------------------------------------------
    section('2. Catalogo de marcas');

    const brands = await api(tokenA, 'GET', '/api/v1/brands');
    check('GET /brands responde 200', brands.status === 200, `recibido ${brands.status}`);

    const list = brands.body?.data ?? [];
    check('el catalogo global esta sembrado (32 marcas)', list.length === 32, `hay ${list.length}`);
    check(
      'la agregacion cars(count) funciona',
      list.every((brand) => typeof brand.car_count === 'number'),
      'si falla aqui, el conteo incrustado no es compatible: avisame',
    );
    check(
      'no se expone created_by',
      list.every((brand) => !('created_by' in brand)),
    );

    const hotWheels = list.find((brand) => brand.slug === 'hot-wheels');
    check('existe la marca hot-wheels', Boolean(hotWheels));
    brandId = hotWheels?.id ?? list[0]?.id;

    const filtradas = await api(tokenA, 'GET', '/api/v1/brands?q=hot');
    check('el filtro ?q= reduce el catalogo', (filtradas.body?.data?.length ?? 99) < list.length);

    const countInicial = hotWheels?.car_count ?? 0;

    // -----------------------------------------------------------------------
    section('3. Crear un auto');

    const creado = await api(tokenA, 'POST', '/api/v1/cars', {
      brand_id: brandId,
      model: 'ZZ Smoke Test 911 GT3',
      vehicle_make: 'Porsche',
      year: 2024,
      quantity: 2,
      // Inyeccion deliberada: debe ser ignorada.
      user_id: '00000000-0000-4000-8000-000000000000',
    });

    check('POST /cars responde 201', creado.status === 201, `recibido ${creado.status}`);
    carId = creado.body?.data?.id ?? null;
    check('devuelve la cabecera Location', Boolean(creado.headers.get('location')));
    check('el auto trae su marca incrustada', Boolean(creado.body?.data?.brand?.name));
    check('quantity se guardo como se envio', creado.body?.data?.quantity === 2);

    const invalido = await api(tokenA, 'POST', '/api/v1/cars', { model: '' });
    check('un auto invalido responde 422', invalido.status === 422, `recibido ${invalido.status}`);
    check(
      'el error detalla los campos que fallan',
      Array.isArray(invalido.body?.error?.details) && invalido.body.error.details.length > 0,
    );

    const marcaInventada = await api(tokenA, 'POST', '/api/v1/cars', {
      brand_id: '00000000-0000-4000-8000-000000000001',
      model: 'Marca inexistente',
    });
    check(
      'un fabricante inexistente responde 404 BRAND_NOT_FOUND',
      marcaInventada.status === 404 && marcaInventada.body?.error?.code === 'BRAND_NOT_FOUND',
      `recibido ${marcaInventada.status}`,
    );

    // -----------------------------------------------------------------------
    section('4. Leer, listar y paginar');

    const detalle = await api(tokenA, 'GET', `/api/v1/cars/${carId}`);
    check('GET /cars/:id responde 200', detalle.status === 200);

    const listado = await api(tokenA, 'GET', '/api/v1/cars?limit=20');
    check('GET /cars responde 200', listado.status === 200);
    check(
      'el auto recien creado aparece en la lista',
      (listado.body?.data ?? []).some((car) => car.id === carId),
    );
    check(
      'la respuesta trae meta de paginacion',
      listado.body?.meta !== undefined && 'has_more' in (listado.body?.meta ?? {}),
    );

    const cursorMalo = await api(tokenA, 'GET', '/api/v1/cars?cursor=basura-inventada');
    check('un cursor manipulado responde 422', cursorMalo.status === 422);

    const idMalo = await api(tokenA, 'GET', '/api/v1/cars/no-es-uuid');
    check('un id que no es UUID responde 422', idMalo.status === 422);

    const deLaMarca = await api(tokenA, 'GET', `/api/v1/brands/${brandId}/cars`);
    check('GET /brands/:id/cars responde 200', deLaMarca.status === 200);
    check(
      'incluye el auto de esa marca',
      (deLaMarca.body?.data ?? []).some((car) => car.id === carId),
    );

    const marcaFantasma = await api(
      tokenA,
      'GET',
      '/api/v1/brands/00000000-0000-4000-8000-000000000001/cars',
    );
    check('los autos de una marca inexistente dan 404', marcaFantasma.status === 404);

    // -----------------------------------------------------------------------
    section('5. El conteo de la pantalla de Marcas');

    const brandsDespues = await api(tokenA, 'GET', '/api/v1/brands');
    const usada = (brandsDespues.body?.data ?? []).find((brand) => brand.id === brandId);
    check(
      'car_count subio en 1 al crear el auto',
      usada?.car_count === countInicial + 1,
      `esperado ${countInicial + 1}, recibido ${usada?.car_count}`,
    );

    // -----------------------------------------------------------------------
    section('6. Edicion parcial');

    const parcheado = await api(tokenA, 'PATCH', `/api/v1/cars/${carId}`, { quantity: 5 });
    check('PATCH responde 200', parcheado.status === 200);
    check('cambia el campo enviado', parcheado.body?.data?.quantity === 5);
    check(
      'NO borra los campos que no se enviaron',
      parcheado.body?.data?.vehicle_make === 'Porsche' && parcheado.body?.data?.year === 2024,
      'un PATCH no debe poner a NULL lo que no menciona',
    );

    const parcheVacio = await api(tokenA, 'PATCH', `/api/v1/cars/${carId}`, {});
    check('un PATCH vacio responde 422', parcheVacio.status === 422);

    const borrarCampo = await api(tokenA, 'PATCH', `/api/v1/cars/${carId}`, {
      vehicle_make: null,
    });
    check(
      'enviar null si borra el campo',
      borrarCampo.status === 200 && borrarCampo.body?.data?.vehicle_make === null,
    );

    // -----------------------------------------------------------------------
    section('7. AISLAMIENTO ENTRE USUARIOS');

    const leerAjeno = await api(tokenB, 'GET', `/api/v1/cars/${carId}`);
    check(
      'B no puede LEER el auto de A (404, no 403)',
      leerAjeno.status === 404,
      `recibido ${leerAjeno.status}: un 403 confirmaria que ese id existe`,
    );

    const editarAjeno = await api(tokenB, 'PATCH', `/api/v1/cars/${carId}`, { quantity: 999 });
    check('B no puede MODIFICAR el auto de A', editarAjeno.status === 404);

    const borrarAjeno = await api(tokenB, 'DELETE', `/api/v1/cars/${carId}`);
    check('B no puede BORRAR el auto de A', borrarAjeno.status === 404);

    const listaB = await api(tokenB, 'GET', '/api/v1/cars?limit=50');
    check(
      'el auto de A no aparece en la lista de B',
      !(listaB.body?.data ?? []).some((car) => car.id === carId),
    );

    const brandsB = await api(tokenB, 'GET', '/api/v1/brands');
    const usadaB = (brandsB.body?.data ?? []).find((brand) => brand.id === brandId);
    check(
      'el car_count de B no incluye los autos de A',
      usadaB?.car_count === 0,
      `recibido ${usadaB?.car_count}: la agregacion no estaria respetando la RLS`,
    );

    const deLaMarcaB = await api(tokenB, 'GET', `/api/v1/brands/${brandId}/cars`);
    check(
      'los autos de esa marca para B no incluyen los de A',
      !(deLaMarcaB.body?.data ?? []).some((car) => car.id === carId),
    );

    // A sigue viendo lo suyo despues de todo lo anterior.
    const sigueAhi = await api(tokenA, 'GET', `/api/v1/cars/${carId}`);
    check(
      'el auto de A sigue intacto',
      sigueAhi.status === 200 && sigueAhi.body?.data?.quantity === 5,
    );

    // -----------------------------------------------------------------------
    section('8. Borrado');

    const borrado = await api(tokenA, 'DELETE', `/api/v1/cars/${carId}`);
    check('DELETE responde 204 sin cuerpo', borrado.status === 204);

    const otraVez = await api(tokenA, 'DELETE', `/api/v1/cars/${carId}`);
    check('borrar dos veces responde 404', otraVez.status === 404);

    if (borrado.status === 204) carId = null;
  } finally {
    // Limpieza: si algo fallo a mitad, no dejamos basura en la coleccion.
    if (carId) {
      await api(tokenA, 'DELETE', `/api/v1/cars/${carId}`).catch(() => {});
      console.log('\n(Se limpio el auto de prueba que habia quedado)');
    }
  }

  // -------------------------------------------------------------------------
  console.log(`\n${'='.repeat(52)}`);

  if (failures.length === 0) {
    console.log(` TODO CORRECTO — ${passed} comprobaciones`);
    console.log('='.repeat(52));
    console.log('\nLa API funciona contra la base de datos real y el aislamiento');
    console.log('entre usuarios se cumple de extremo a extremo.');
    process.exit(0);
  }

  console.log(` ${passed} correctas, ${failures.length} FALLIDAS`);
  console.log('='.repeat(52));
  for (const failure of failures) {
    console.log(`\n  - ${failure.description}`);
    if (failure.detail) console.log(`    ${failure.detail}`);
  }
  console.log('\nPasame esta salida tal cual.');
  process.exit(1);
}

await main();
