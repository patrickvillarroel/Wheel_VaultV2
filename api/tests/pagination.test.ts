import { describe, expect, it } from 'vitest';
import { buildPage, decodeCursor, encodeCursor } from '../src/shared/pagination.js';
import { AppError } from '../src/shared/errors/AppError.js';

const CREATED_AT = '2026-09-30T12:00:00.000Z';
const ID = '11111111-1111-4111-8111-111111111111';

describe('cursor', () => {
  it('va y vuelve sin perder información', () => {
    const cursor = encodeCursor({ createdAt: CREATED_AT, id: ID });

    expect(decodeCursor(cursor)).toEqual({ createdAt: CREATED_AT, id: ID });
  });

  it('normaliza la fecha a ISO con Z', () => {
    // Un timestamp con offset (+02:00) contiene un '+', que en una URL significa
    // espacio. Normalizarlo evita depender del encoding de cada cliente.
    const cursor = encodeCursor({ createdAt: '2026-09-30T14:00:00+02:00', id: ID });

    expect(decodeCursor(cursor).createdAt).toBe(CREATED_AT);
  });

  it('es opaco: no expone los valores en claro', () => {
    const cursor = encodeCursor({ createdAt: CREATED_AT, id: ID });

    expect(cursor).not.toContain(ID);
    expect(cursor).not.toContain('2026-09-30');
  });

  it('rechaza un cursor que no es base64 válido', () => {
    expect(() => decodeCursor('%%%no-es-base64%%%')).toThrow(AppError);
  });

  it('rechaza un cursor manipulado con un id que no es UUID', () => {
    const tampered = Buffer.from(JSON.stringify({ c: CREATED_AT, i: 'soy-otro-usuario' })).toString(
      'base64url',
    );

    expect(() => decodeCursor(tampered)).toThrow(AppError);
  });

  it('rechaza un cursor sin los campos esperados', () => {
    const tampered = Buffer.from(JSON.stringify({ hola: 'mundo' })).toString('base64url');

    expect(() => decodeCursor(tampered)).toThrow(AppError);
  });

  it('responde 422, no 500, ante un cursor invalido', () => {
    try {
      decodeCursor('basura');
      expect.unreachable('debería haber lanzado');
    } catch (error) {
      expect((error as AppError).statusCode).toBe(422);
      expect((error as AppError).code).toBe('VALIDATION_ERROR');
    }
  });
});

describe('buildPage', () => {
  const rows = Array.from({ length: 4 }, (_, index) => ({
    id: `0000000${index}-1111-4111-8111-111111111111`,
    created_at: `2026-09-2${index + 4}T12:00:00.000Z`,
  }));

  const toCursor = (row: { id: string; created_at: string }) => ({
    createdAt: row.created_at,
    id: row.id,
  });

  it('con una fila de más, recorta y marca has_more', () => {
    // El repositorio pide limit + 1 para saber si hay siguiente pagina sin
    // lanzar un COUNT aparte.
    const page = buildPage(rows, 3, toCursor);

    expect(page.items).toHaveLength(3);
    expect(page.meta.has_more).toBe(true);
    expect(page.meta.next_cursor).not.toBeNull();
  });

  it('el cursor apunta a la última fila devuelta, no a la descartada', () => {
    const page = buildPage(rows, 3, toCursor);

    expect(decodeCursor(page.meta.next_cursor as string).id).toBe(rows[2]?.id);
  });

  it('sin fila de más, no hay siguiente pagina', () => {
    const page = buildPage(rows.slice(0, 3), 3, toCursor);

    expect(page.items).toHaveLength(3);
    expect(page.meta.has_more).toBe(false);
    expect(page.meta.next_cursor).toBeNull();
  });

  it('una colección vacía no rompe nada', () => {
    const page = buildPage([], 20, toCursor);

    expect(page.items).toEqual([]);
    expect(page.meta.has_more).toBe(false);
    expect(page.meta.next_cursor).toBeNull();
  });
});
