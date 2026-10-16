import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../src/modules/cars/cars.repository.js', () => ({
  list: vi.fn(),
  findById: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  countForUser: vi.fn(),
  totalsForFilters: vi.fn(),
}));

vi.mock('../src/modules/brands/brands.repository.js', () => ({
  listVisible: vi.fn(),
  findById: vi.fn(),
  findVisibleById: vi.fn(),
}));

const { createApp } = await import('../src/app.js');
const carsRepository = await import('../src/modules/cars/cars.repository.js');
const brandsRepository = await import('../src/modules/brands/brands.repository.js');
const { TEST_USER_ID, signTestToken } = await import('./helpers/tokens.js');

const app = createApp();

const brand = (id: string, count: number) => ({
  id,
  name: `Marca ${id}`,
  slug: `marca-${id}`,
  description: null,
  logo_url: null,
  cars: count > 0 ? [{ count }] : [],
});

let token: string;

beforeEach(async () => {
  vi.clearAllMocks();
  token = await signTestToken();
  vi.mocked(carsRepository.countForUser).mockResolvedValue(0);
  vi.mocked(carsRepository.list).mockResolvedValue([]);
  vi.mocked(brandsRepository.listVisible).mockResolvedValue([]);
});

function authed(path: string) {
  return request(app).get(path).set('Authorization', `Bearer ${token}`);
}

describe('GET /api/v1/stats/summary', () => {
  it('exige token', async () => {
    const response = await request(app).get('/api/v1/stats/summary');

    expect(response.status).toBe(401);
    expect(carsRepository.countForUser).not.toHaveBeenCalled();
  });

  it('devuelve el resumen con el total y los recientes', async () => {
    vi.mocked(carsRepository.countForUser).mockResolvedValue(12);
    vi.mocked(brandsRepository.listVisible).mockResolvedValue([
      brand('a', 7),
      brand('b', 5),
      brand('c', 0),
    ]);

    const response = await authed('/api/v1/stats/summary');

    expect(response.status).toBe(200);
    expect(response.body.data.total_cars).toBe(12);
  });

  it('cuenta solo las marcas de las que el usuario tiene algo', async () => {
    // El catálogo global tiene 32 marcas; el resumen debe hablar de la
    // colección del usuario, no del catálogo.
    vi.mocked(brandsRepository.listVisible).mockResolvedValue([
      brand('a', 7),
      brand('b', 0),
      brand('c', 0),
      brand('d', 2),
    ]);

    const response = await authed('/api/v1/stats/summary');

    expect(response.body.data.total_brands).toBe(2);
  });

  it('una colección vacía devuelve ceros, no un error', async () => {
    const response = await authed('/api/v1/stats/summary');

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ total_cars: 0, total_brands: 0, recent: [] });
  });

  it('consulta siempre con el user_id del token', async () => {
    await authed('/api/v1/stats/summary');

    expect(carsRepository.countForUser).toHaveBeenCalledWith(expect.anything(), TEST_USER_ID);
    expect(carsRepository.list).toHaveBeenCalledWith(
      expect.anything(),
      TEST_USER_ID,
      expect.anything(),
    );
  });

  it('pide un número acotado de recientes, no la colección entera', async () => {
    await authed('/api/v1/stats/summary');

    const params = vi.mocked(carsRepository.list).mock.calls[0]?.[2];
    expect(params?.limit).toBeLessThanOrEqual(10);
    expect(params?.ascending).toBe(false);
  });
});
