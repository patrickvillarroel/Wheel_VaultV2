import { describe, expect, it } from 'vitest';
import { verifyAccessToken } from '../src/config/jwt.js';
import { AppError } from '../src/shared/errors/AppError.js';
import { TEST_USER_ID, signExpiredToken, signTestToken } from './helpers/tokens.js';

/**
 * Verificación de tokens. Es el control que separa "cualquiera" de "este
 * usuario", así que cada forma de token invalido tiene su prueba.
 */
describe('verifyAccessToken', () => {
  it('acepta un token válido y devuelve el usuario del claim sub', async () => {
    const token = await signTestToken({ email: 'ana@example.test' });

    const user = await verifyAccessToken(token);

    expect(user).toEqual({ id: TEST_USER_ID, email: 'ana@example.test' });
  });

  it('rechaza un token caducado con AUTH_TOKEN_EXPIRED', async () => {
    const token = await signExpiredToken();

    await expect(verifyAccessToken(token)).rejects.toMatchObject({
      code: 'AUTH_TOKEN_EXPIRED',
      statusCode: 401,
    });
  });

  it('rechaza un token firmado con otra clave', async () => {
    const token = await signTestToken({ secret: 'otra-clave-completamente-distinta-1234567890' });

    await expect(verifyAccessToken(token)).rejects.toMatchObject({
      code: 'AUTH_TOKEN_INVALID',
      statusCode: 401,
    });
  });

  it('rechaza un token válido de OTRO proyecto de Supabase (issuer distinto)', async () => {
    const token = await signTestToken({ issuer: 'https://otro-proyecto.supabase.co/auth/v1' });

    await expect(verifyAccessToken(token)).rejects.toMatchObject({
      code: 'AUTH_TOKEN_INVALID',
    });
  });

  it('rechaza un token con otra audiencia', async () => {
    const token = await signTestToken({ audience: 'anon' });

    await expect(verifyAccessToken(token)).rejects.toMatchObject({
      code: 'AUTH_TOKEN_INVALID',
    });
  });

  it('rechaza un token sin claim sub', async () => {
    const token = await signTestToken({ sub: null });

    await expect(verifyAccessToken(token)).rejects.toMatchObject({
      code: 'AUTH_TOKEN_INVALID',
    });
  });

  it('rechaza un texto que no es un JWT', async () => {
    await expect(verifyAccessToken('esto-no-es-un-token')).rejects.toBeInstanceOf(AppError);
  });

  it('no filtra el motivo interno del fallo en el mensaje visible', async () => {
    const token = await signTestToken({ secret: 'otra-clave-completamente-distinta-1234567890' });

    try {
      await verifyAccessToken(token);
      expect.unreachable('debería haber rechazado el token');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      // El motivo real ("signature verification failed") va solo a `internal`,
      // que el errorHandler registra en el log pero nunca envia al cliente.
      expect((error as AppError).message).toBe('El token no es válido');
    }
  });
});
