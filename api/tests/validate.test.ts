import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { requestContext } from '../src/middleware/requestContext.js';
import { validate, validated } from '../src/middleware/validate.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

const bodySchema = z.object({
  model: z.string().min(1).max(100),
  quantity: z.coerce.number().int().min(1).max(9999),
});

const paramsSchema = z.object({
  id: z.uuid(),
});

function buildApp() {
  const app = express();
  app.use(requestContext);
  app.use(express.json());

  app.post('/cars', validate({ body: bodySchema }), (req, res) => {
    res.json({ received: validated(req, 'body', bodySchema) });
  });

  app.get('/cars/:id', validate({ params: paramsSchema }), (req, res) => {
    res.json({ received: validated(req, 'params', paramsSchema) });
  });

  app.use(errorHandler);
  return app;
}

const app = buildApp();

describe('validate', () => {
  it('deja pasar un body válido', async () => {
    const response = await request(app).post('/cars').send({ model: '911 GT3', quantity: 2 });

    expect(response.status).toBe(200);
    expect(response.body.received).toEqual({ model: '911 GT3', quantity: 2 });
  });

  it('descarta los campos no declarados en el esquema', async () => {
    // Un cliente malicioso intenta colar su propio user_id en el body.
    const response = await request(app)
      .post('/cars')
      .send({ model: '911 GT3', quantity: 1, user_id: 'otro-usuario' });

    expect(response.status).toBe(200);
    expect(response.body.received).not.toHaveProperty('user_id');
  });

  it('422 con el detalle por campo cuando el body es invalido', async () => {
    const response = await request(app).post('/cars').send({ model: '', quantity: 0 });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');

    const fields = response.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toContain('body.model');
    expect(fields).toContain('body.quantity');
  });

  it('422 cuando falta un campo obligatorio', async () => {
    const response = await request(app).post('/cars').send({ quantity: 1 });

    expect(response.status).toBe(422);
    expect(response.body.error.details[0].field).toBe('body.model');
  });

  it('422 cuando un path param no es un UUID', async () => {
    const response = await request(app).get('/cars/no-es-uuid');

    expect(response.status).toBe(422);
    expect(response.body.error.details[0].field).toBe('params.id');
  });

  it('400 cuando el JSON esta malformado', async () => {
    const response = await request(app)
      .post('/cars')
      .set('Content-Type', 'application/json')
      .send('{"model": ');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
