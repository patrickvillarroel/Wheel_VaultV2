import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../src/modules/profile/profile.repository.js', () => ({
  findById: vi.fn(),
  update: vi.fn(),
}));

const { createApp } = await import('../src/app.js');
const profileRepository = await import('../src/modules/profile/profile.repository.js');
const { TEST_USER_ID, signTestToken } = await import('./helpers/tokens.js');

const app = createApp();

const OTHER_USER_ID = '99999999-9999-4999-8999-999999999999';

const profile = {
  id: TEST_USER_ID,
  display_name: 'Patrick',
  avatar_path: null,
  bio: null,
  created_at: '2026-10-01T00:00:00.000Z',
  updated_at: '2026-10-01T00:00:00.000Z',
};

let token: string;

beforeEach(async () => {
  vi.clearAllMocks();
  token = await signTestToken();
  vi.mocked(profileRepository.findById).mockResolvedValue(profile);
  vi.mocked(profileRepository.update).mockResolvedValue(profile);
});

function authed(method: 'get' | 'patch', path: string) {
  return request(app)[method](path).set('Authorization', `Bearer ${token}`);
}

describe('GET /api/v1/profile', () => {
  it('exige token', async () => {
    const response = await request(app).get('/api/v1/profile');

    expect(response.status).toBe(401);
    expect(profileRepository.findById).not.toHaveBeenCalled();
  });

  it('devuelve el perfil del usuario del token', async () => {
    const response = await authed('get', '/api/v1/profile');

    expect(response.status).toBe(200);
    expect(response.body.data.display_name).toBe('Patrick');
    expect(profileRepository.findById).toHaveBeenCalledWith(expect.anything(), TEST_USER_ID);
  });

  it('404 si no existe el perfil', async () => {
    // El trigger deberia haberlo creado al registrarse; si falta, es un fallo
    // real y conviene que se vea, no que la pantalla muestre datos vacios.
    vi.mocked(profileRepository.findById).mockResolvedValue(null);

    const response = await authed('get', '/api/v1/profile');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('PROFILE_NOT_FOUND');
  });
});

describe('PATCH /api/v1/profile', () => {
  it('exige token', async () => {
    const response = await request(app).patch('/api/v1/profile').send({ display_name: 'X' });

    expect(response.status).toBe(401);
    expect(profileRepository.update).not.toHaveBeenCalled();
  });

  it('actualiza el nombre', async () => {
    await authed('patch', '/api/v1/profile').send({ display_name: 'Patrick V' });

    expect(profileRepository.update).toHaveBeenCalledWith(expect.anything(), TEST_USER_ID, {
      display_name: 'Patrick V',
    });
  });

  it('recorta los espacios del nombre', async () => {
    await authed('patch', '/api/v1/profile').send({ display_name: '  Patrick  ' });

    expect(vi.mocked(profileRepository.update).mock.calls[0]?.[2]).toEqual({
      display_name: 'Patrick',
    });
  });

  it('edita SIEMPRE el perfil del token, ignorando el id del cuerpo', async () => {
    await authed('patch', '/api/v1/profile').send({
      display_name: 'Patrick',
      id: OTHER_USER_ID,
    });

    expect(profileRepository.update).toHaveBeenCalledWith(expect.anything(), TEST_USER_ID, {
      display_name: 'Patrick',
    });
  });

  it('no deja cambiar el correo por aquí', async () => {
    // Cambiar el email es un flujo de Supabase Auth con su confirmación;
    // aceptarlo aquí dejaría la cuenta y el perfil descoordinados.
    await authed('patch', '/api/v1/profile').send({
      display_name: 'Patrick',
      email: 'otro@example.test',
    });

    expect(vi.mocked(profileRepository.update).mock.calls[0]?.[2]).not.toHaveProperty('email');
  });

  it('422 con un nombre vacío', async () => {
    const response = await authed('patch', '/api/v1/profile').send({ display_name: '   ' });

    expect(response.status).toBe(422);
    expect(response.body.error.details[0].field).toBe('body.display_name');
    expect(profileRepository.update).not.toHaveBeenCalled();
  });

  it('422 con un nombre demasiado largo', async () => {
    const response = await authed('patch', '/api/v1/profile').send({
      display_name: 'x'.repeat(51),
    });

    expect(response.status).toBe(422);
  });
});
