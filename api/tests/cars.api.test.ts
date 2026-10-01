import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

/**
 * Pruebas de la API de autos a nivel HTTP.
 *
 * Los repositorios estan simulados: lo que se verifica aqui es la capa que
 * controlamos nosotros —autenticacion, validacion, traduccion de errores y, lo
 * mas importante, de donde sale el user_id—, no el comportamiento de Postgres.
 *
 * El aislamiento real entre usuarios se prueba contra la base de datos en
 * supabase/tests/rls_isolation.sql.
 */

vi.mock('../src/modules/cars/cars.repository.js', () => ({
  list: vi.fn(),
  findById: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('../src/modules/brands/brands.repository.js', () => ({
  findVisibleById: vi.fn(),
}));

const { createApp } = await import('../src/app.js');
const carsRepository = await import('../src/modules/cars/cars.repository.js');
const brandsRepository = await import('../src/modules/brands/brands.repository.js');
const { TEST_USER_ID, signTestToken } = await import('./helpers/tokens.js');

const app = createApp();

const BRAND_ID = '22222222-2222-4222-8222-222222222222';
const CAR_ID = '33333333-3333-4333-8333-333333333333';
const OTHER_USER_ID = '99999999-9999-4999-8999-999999999999';

const brand = { id: BRAND_ID, name: 'Hot Wheels', slug: 'hot-wheels', logo_url: null };

const car = {
  id: CAR_ID,
  model: 'Porsche 911 GT3',
  vehicle_make: 'Porsche',
  year: 2024,
  description: null,
  quantity: 1,
  is_favorite: false,
  image_path: null,
  created_at: '2026-09-30T12:00:00.000Z',
  updated_at: '2026-09-30T12:00:00.000Z',
  brand,
};

let token: string;

beforeEach(async () => {
  vi.clearAllMocks();
  token = await signTestToken();
  vi.mocked(brandsRepository.findVisibleById).mockResolvedValue(brand);
});

function authed(method: 'get' | 'post' | 'patch' | 'delete', path: string) {
  return request(app)[method](path).set('Authorization', `Bearer ${token}`);
}

describe('autenticacion', () => {
  it.each([
    ['get', '/api/v1/cars'],
    ['post', '/api/v1/cars'],
    ['get', `/api/v1/cars/${CAR_ID}`],
    ['patch', `/api/v1/cars/${CAR_ID}`],
    ['delete', `/api/v1/cars/${CAR_ID}`],
  ] as const)('%s %s exige token', async (method, path) => {
    const response = await request(app)[method](path);

    expect(response.status).toBe(401);
    expect(carsRepository.list).not.toHaveBeenCalled();
    expect(carsRepository.insert).not.toHaveBeenCalled();
  });
});

describe('GET /api/v1/cars', () => {
  it('devuelve la lista con su meta de paginacion', async () => {
    vi.mocked(carsRepository.list).mockResolvedValue([car]);

    const response = await authed('get', '/api/v1/cars');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta).toEqual({ next_cursor: null, has_more: false });
  });

  it('consulta SIEMPRE con el user_id del token', async () => {
    vi.mocked(carsRepository.list).mockResolvedValue([]);

    await authed('get', '/api/v1/cars');

    expect(carsRepository.list).toHaveBeenCalledWith(
      expect.anything(),
      TEST_USER_ID,
      expect.anything(),
    );
  });

  it('ignora un user_id enviado en la query', async () => {
    vi.mocked(carsRepository.list).mockResolvedValue([]);

    await authed('get', `/api/v1/cars?user_id=${OTHER_USER_ID}`);

    expect(carsRepository.list).toHaveBeenCalledWith(
      expect.anything(),
      TEST_USER_ID,
      expect.anything(),
    );
  });

  it('pide una fila de mas que el limite solicitado', async () => {
    vi.mocked(carsRepository.list).mockResolvedValue([]);

    await authed('get', '/api/v1/cars?limit=10');

    expect(vi.mocked(carsRepository.list).mock.calls[0]?.[2]).toMatchObject({ limit: 11 });
  });

  it('aplica el filtro por fabricante', async () => {
    vi.mocked(carsRepository.list).mockResolvedValue([]);

    await authed('get', `/api/v1/cars?brand_id=${BRAND_ID}`);

    expect(vi.mocked(carsRepository.list).mock.calls[0]?.[2]).toMatchObject({ brandId: BRAND_ID });
  });

  it('sort=oldest invierte el orden', async () => {
    vi.mocked(carsRepository.list).mockResolvedValue([]);

    await authed('get', '/api/v1/cars?sort=oldest');

    expect(vi.mocked(carsRepository.list).mock.calls[0]?.[2]).toMatchObject({ ascending: true });
  });

  it('422 si el limite supera el maximo permitido', async () => {
    const response = await authed('get', '/api/v1/cars?limit=500');

    expect(response.status).toBe(422);
    expect(response.body.error.details[0].field).toBe('query.limit');
  });

  it('422 si el cursor esta manipulado', async () => {
    const response = await authed('get', '/api/v1/cars?cursor=basura-inventada');

    expect(response.status).toBe(422);
    expect(carsRepository.list).not.toHaveBeenCalled();
  });

  it('422 si sort no es un valor permitido', async () => {
    const response = await authed('get', '/api/v1/cars?sort=precio');

    expect(response.status).toBe(422);
  });
});

describe('POST /api/v1/cars', () => {
  it('crea el auto y devuelve 201 con la cabecera Location', async () => {
    vi.mocked(carsRepository.insert).mockResolvedValue(car);

    const response = await authed('post', '/api/v1/cars').send({
      brand_id: BRAND_ID,
      model: 'Porsche 911 GT3',
    });

    expect(response.status).toBe(201);
    expect(response.headers['location']).toBe(`/api/v1/cars/${CAR_ID}`);
    expect(response.body.data.id).toBe(CAR_ID);
  });

  it('el user_id guardado es el del token, no el del body', async () => {
    vi.mocked(carsRepository.insert).mockResolvedValue(car);

    await authed('post', '/api/v1/cars').send({
      brand_id: BRAND_ID,
      model: 'Porsche 911 GT3',
      user_id: OTHER_USER_ID,
    });

    expect(vi.mocked(carsRepository.insert).mock.calls[0]?.[1]).toMatchObject({
      user_id: TEST_USER_ID,
    });
  });

  it('404 si el fabricante no existe o no es visible para el usuario', async () => {
    vi.mocked(brandsRepository.findVisibleById).mockResolvedValue(null);

    const response = await authed('post', '/api/v1/cars').send({
      brand_id: BRAND_ID,
      model: 'Porsche 911 GT3',
    });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('BRAND_NOT_FOUND');
    expect(carsRepository.insert).not.toHaveBeenCalled();
  });

  it('422 con el detalle por campo cuando faltan datos', async () => {
    const response = await authed('post', '/api/v1/cars').send({ model: '' });

    expect(response.status).toBe(422);

    const fields = response.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toContain('body.brand_id');
    expect(fields).toContain('body.model');
  });
});

describe('GET /api/v1/cars/:id', () => {
  it('devuelve el auto', async () => {
    vi.mocked(carsRepository.findById).mockResolvedValue(car);

    const response = await authed('get', `/api/v1/cars/${CAR_ID}`);

    expect(response.status).toBe(200);
    expect(response.body.data.brand.name).toBe('Hot Wheels');
  });

  it('404 cuando no existe o es de otro usuario', async () => {
    // La RLS mas el filtro por user_id hacen que ambos casos sean
    // indistinguibles aqui, y eso es intencionado: un 403 confirmaria que ese
    // id existe.
    vi.mocked(carsRepository.findById).mockResolvedValue(null);

    const response = await authed('get', `/api/v1/cars/${CAR_ID}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('CAR_NOT_FOUND');
  });

  it('422 si el id no es un UUID', async () => {
    const response = await authed('get', '/api/v1/cars/12');

    expect(response.status).toBe(422);
    expect(carsRepository.findById).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/v1/cars/:id', () => {
  it('envia a la base de datos solo los campos recibidos', async () => {
    vi.mocked(carsRepository.update).mockResolvedValue(car);

    await authed('patch', `/api/v1/cars/${CAR_ID}`).send({ quantity: 5 });

    // Sin filtrar los `undefined`, este PATCH pondria description, year y
    // vehicle_make a NULL sin que nadie lo pidiera.
    expect(vi.mocked(carsRepository.update).mock.calls[0]?.[3]).toEqual({ quantity: 5 });
  });

  it('permite borrar un campo opcional enviando null', async () => {
    vi.mocked(carsRepository.update).mockResolvedValue(car);

    await authed('patch', `/api/v1/cars/${CAR_ID}`).send({ description: null });

    expect(vi.mocked(carsRepository.update).mock.calls[0]?.[3]).toEqual({ description: null });
  });

  it('actualiza siempre acotando por el user_id del token', async () => {
    vi.mocked(carsRepository.update).mockResolvedValue(car);

    await authed('patch', `/api/v1/cars/${CAR_ID}`).send({ quantity: 2 });

    expect(carsRepository.update).toHaveBeenCalledWith(
      expect.anything(),
      TEST_USER_ID,
      CAR_ID,
      expect.anything(),
    );
  });

  it('404 cuando el auto no es del usuario', async () => {
    vi.mocked(carsRepository.update).mockResolvedValue(null);

    const response = await authed('patch', `/api/v1/cars/${CAR_ID}`).send({ quantity: 2 });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('CAR_NOT_FOUND');
  });

  it('422 ante un PATCH vacio', async () => {
    const response = await authed('patch', `/api/v1/cars/${CAR_ID}`).send({});

    expect(response.status).toBe(422);
    expect(carsRepository.update).not.toHaveBeenCalled();
  });

  it('404 si se intenta mover el auto a un fabricante no visible', async () => {
    vi.mocked(brandsRepository.findVisibleById).mockResolvedValue(null);

    const response = await authed('patch', `/api/v1/cars/${CAR_ID}`).send({ brand_id: BRAND_ID });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('BRAND_NOT_FOUND');
    expect(carsRepository.update).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/v1/cars/:id', () => {
  it('204 sin cuerpo cuando se borra', async () => {
    vi.mocked(carsRepository.remove).mockResolvedValue(true);

    const response = await authed('delete', `/api/v1/cars/${CAR_ID}`);

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});
  });

  it('borra acotando por el user_id del token', async () => {
    vi.mocked(carsRepository.remove).mockResolvedValue(true);

    await authed('delete', `/api/v1/cars/${CAR_ID}`);

    expect(carsRepository.remove).toHaveBeenCalledWith(expect.anything(), TEST_USER_ID, CAR_ID);
  });

  it('404 cuando no hay nada que borrar', async () => {
    vi.mocked(carsRepository.remove).mockResolvedValue(false);

    const response = await authed('delete', `/api/v1/cars/${CAR_ID}`);

    expect(response.status).toBe(404);
  });
});
