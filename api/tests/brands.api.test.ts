import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

/**
 * Pruebas HTTP de la API de marcas, con los repositorios simulados.
 *
 * Lo que importa aquí: que el catalogo exija token (el car_count son datos
 * personales), que una marca inexistente de 404 y que el listado de autos de
 * una marca siga acotado por el user_id del token.
 */

vi.mock('../src/modules/brands/brands.repository.js', () => ({
  listVisible: vi.fn(),
  findById: vi.fn(),
  findVisibleById: vi.fn(),
}));

vi.mock('../src/modules/cars/cars.repository.js', () => ({
  list: vi.fn(),
  findById: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  countForUser: vi.fn(),
  totalsForFilters: vi.fn(),
}));

const { createApp } = await import('../src/app.js');
const brandsRepository = await import('../src/modules/brands/brands.repository.js');
const carsRepository = await import('../src/modules/cars/cars.repository.js');
const { TEST_USER_ID, signTestToken } = await import('./helpers/tokens.js');

const app = createApp();

const BRAND_ID = '22222222-2222-4222-8222-222222222222';

const brandRow = {
  id: BRAND_ID,
  name: 'Hot Wheels',
  slug: 'hot-wheels',
  description: 'Marca de Mattel creada en 1968.',
  logo_url: null,
  cars: [{ count: 7 }],
};

let token: string;

beforeEach(async () => {
  vi.clearAllMocks();
  token = await signTestToken();
  vi.mocked(carsRepository.totalsForFilters).mockResolvedValue({ models: 0, units: 0 });
});

function authed(path: string) {
  return request(app).get(path).set('Authorization', `Bearer ${token}`);
}

describe('autenticación', () => {
  it.each(['/api/v1/brands', `/api/v1/brands/${BRAND_ID}`, `/api/v1/brands/${BRAND_ID}/cars`])(
    '%s exige token',
    async (path) => {
      // El catalogo es casi todo global, pero el car_count de cada marca son
      // datos de la colección del usuario.
      const response = await request(app).get(path);

      expect(response.status).toBe(401);
    },
  );
});

describe('GET /api/v1/brands', () => {
  it('devuelve el catalogo con el conteo aplanado', async () => {
    vi.mocked(brandsRepository.listVisible).mockResolvedValue([brandRow]);

    const response = await authed('/api/v1/brands');

    expect(response.status).toBe(200);
    expect(response.body.data[0]).toEqual({
      id: BRAND_ID,
      name: 'Hot Wheels',
      slug: 'hot-wheels',
      description: 'Marca de Mattel creada en 1968.',
      logo_url: null,
      car_count: 7,
    });
  });

  it('una marca sin autos cuenta 0, no undefined', async () => {
    // PostgREST devuelve el array vacio cuando no hay filas que contar.
    vi.mocked(brandsRepository.listVisible).mockResolvedValue([{ ...brandRow, cars: [] }]);

    const response = await authed('/api/v1/brands');

    expect(response.body.data[0].car_count).toBe(0);
  });

  it('pasa el filtro de busqueda al repositorio', async () => {
    vi.mocked(brandsRepository.listVisible).mockResolvedValue([]);

    await authed('/api/v1/brands?q=hot');

    expect(brandsRepository.listVisible).toHaveBeenCalledWith(expect.anything(), 'hot');
  });

  it('una busqueda en blanco equivale a no filtrar', async () => {
    vi.mocked(brandsRepository.listVisible).mockResolvedValue([]);

    await authed('/api/v1/brands?q=%20%20');

    expect(brandsRepository.listVisible).toHaveBeenCalledWith(expect.anything(), undefined);
  });

  it('no expone created_by: a quien pertenece una marca privada es interno', async () => {
    vi.mocked(brandsRepository.listVisible).mockResolvedValue([brandRow]);

    const response = await authed('/api/v1/brands');

    expect(response.body.data[0]).not.toHaveProperty('created_by');
  });
});

describe('GET /api/v1/brands/:id', () => {
  it('devuelve la marca', async () => {
    vi.mocked(brandsRepository.findById).mockResolvedValue(brandRow);

    const response = await authed(`/api/v1/brands/${BRAND_ID}`);

    expect(response.status).toBe(200);
    expect(response.body.data.car_count).toBe(7);
  });

  it('404 si no existe o es privada de otro usuario', async () => {
    vi.mocked(brandsRepository.findById).mockResolvedValue(null);

    const response = await authed(`/api/v1/brands/${BRAND_ID}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('BRAND_NOT_FOUND');
  });

  it('422 si el id no es un UUID', async () => {
    const response = await authed('/api/v1/brands/hot-wheels');

    expect(response.status).toBe(422);
    expect(brandsRepository.findById).not.toHaveBeenCalled();
  });
});

describe('GET /api/v1/brands/:id/cars', () => {
  it('lista los autos del usuario de esa marca', async () => {
    vi.mocked(brandsRepository.findById).mockResolvedValue(brandRow);
    vi.mocked(carsRepository.list).mockResolvedValue([]);

    const response = await authed(`/api/v1/brands/${BRAND_ID}/cars`);

    expect(response.status).toBe(200);
    expect(response.body.meta).toMatchObject({ next_cursor: null, has_more: false });
  });

  it('acota por el user_id del token y por la marca de la URL', async () => {
    vi.mocked(brandsRepository.findById).mockResolvedValue(brandRow);
    vi.mocked(carsRepository.list).mockResolvedValue([]);

    await authed(`/api/v1/brands/${BRAND_ID}/cars`);

    expect(carsRepository.list).toHaveBeenCalledWith(
      expect.anything(),
      TEST_USER_ID,
      expect.objectContaining({ brandId: BRAND_ID }),
    );
  });

  it('404 cuando la marca no existe, en vez de una lista vacía enganosa', async () => {
    // Distinguir "esa marca no existe" de "no tienes autos de esa marca" es lo
    // que permite a la pantalla mostrar un mensaje útil.
    vi.mocked(brandsRepository.findById).mockResolvedValue(null);

    const response = await authed(`/api/v1/brands/${BRAND_ID}/cars`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('BRAND_NOT_FOUND');
    expect(carsRepository.list).not.toHaveBeenCalled();
  });

  it('200 con lista vacía cuando la marca existe pero no hay autos', async () => {
    vi.mocked(brandsRepository.findById).mockResolvedValue(brandRow);
    vi.mocked(carsRepository.list).mockResolvedValue([]);

    const response = await authed(`/api/v1/brands/${BRAND_ID}/cars`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  it('usa el mismo contrato de paginación que GET /cars', async () => {
    vi.mocked(brandsRepository.findById).mockResolvedValue(brandRow);
    vi.mocked(carsRepository.list).mockResolvedValue([]);

    await authed(`/api/v1/brands/${BRAND_ID}/cars?limit=5`);

    expect(vi.mocked(carsRepository.list).mock.calls[0]?.[2]).toMatchObject({ limit: 6 });
  });

  it('422 si el cursor esta manipulado', async () => {
    vi.mocked(brandsRepository.findById).mockResolvedValue(brandRow);

    const response = await authed(`/api/v1/brands/${BRAND_ID}/cars?cursor=basura`);

    expect(response.status).toBe(422);
    expect(carsRepository.list).not.toHaveBeenCalled();
  });
});
