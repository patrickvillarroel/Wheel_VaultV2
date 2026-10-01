import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { signExpiredToken, signTestToken } from './helpers/tokens.js';

const app = createApp();

describe('GET /health', () => {
  it('responde 200 sin autenticacion', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
  });
});

describe('rutas inexistentes', () => {
  it('responde 404 con el formato de error de la API', async () => {
    const response = await request(app).get('/api/v1/no-existe');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'ROUTE_NOT_FOUND' },
    });
    expect(response.body.request_id).toEqual(expect.any(String));
  });
});

describe('requireAuth en GET /api/v1/me', () => {
  it('401 AUTH_TOKEN_MISSING si no hay header Authorization', async () => {
    const response = await request(app).get('/api/v1/me');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
  });

  it('401 AUTH_TOKEN_INVALID si el header no tiene el formato Bearer', async () => {
    const response = await request(app).get('/api/v1/me').set('Authorization', 'Basic abc123');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_TOKEN_INVALID');
  });

  it('401 AUTH_TOKEN_INVALID si el token es basura', async () => {
    const response = await request(app)
      .get('/api/v1/me')
      .set('Authorization', 'Bearer no-es-un-token');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_TOKEN_INVALID');
  });

  it('401 AUTH_TOKEN_INVALID si el token esta firmado con otra clave', async () => {
    const token = await signTestToken({ secret: 'clave-falsificada-1234567890-abcdefghij' });

    const response = await request(app).get('/api/v1/me').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_TOKEN_INVALID');
  });

  it('401 AUTH_TOKEN_EXPIRED si el token caduco, para que el cliente lo refresque', async () => {
    const token = await signExpiredToken();

    const response = await request(app).get('/api/v1/me').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_TOKEN_EXPIRED');
  });

  it('nunca incluye stack trace ni detalle interno en la respuesta', async () => {
    const response = await request(app)
      .get('/api/v1/me')
      .set('Authorization', 'Bearer no-es-un-token');

    const body = JSON.stringify(response.body);
    expect(body).not.toContain('stack');
    expect(body).not.toContain('at Object');
    expect(response.body.error.details).toBeUndefined();
  });
});

describe('cabeceras de seguridad', () => {
  it('helmet esta activo y no se anuncia Express', async () => {
    const response = await request(app).get('/health');

    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('cada respuesta lleva su X-Request-Id', async () => {
    const response = await request(app).get('/health');

    expect(response.headers['x-request-id']).toEqual(expect.any(String));
  });
});
