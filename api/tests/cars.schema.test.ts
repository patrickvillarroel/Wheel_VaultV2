import { describe, expect, it } from 'vitest';
import { createCarSchema, updateCarSchema } from '@wheel-vault/shared';

const BRAND_ID = '22222222-2222-4222-8222-222222222222';

const valid = {
  brand_id: BRAND_ID,
  model: 'Porsche 911 GT3',
};

describe('createCarSchema', () => {
  it('acepta lo minimo y aplica los valores por defecto', () => {
    const result = createCarSchema.parse(valid);

    expect(result.quantity).toBe(1);
    expect(result.is_favorite).toBe(false);
  });

  it('recorta los espacios del modelo', () => {
    const result = createCarSchema.parse({ ...valid, model: '  911 GT3  ' });

    expect(result.model).toBe('911 GT3');
  });

  it('convierte el texto vacio en null', () => {
    // Un formulario movil envia '' cuando el usuario borra el campo; guardar ''
    // en vez de NULL ensucia los datos.
    const result = createCarSchema.parse({ ...valid, vehicle_make: '', description: '' });

    expect(result.vehicle_make).toBeNull();
    expect(result.description).toBeNull();
  });

  it('rechaza un modelo vacio', () => {
    expect(createCarSchema.safeParse({ ...valid, model: '   ' }).success).toBe(false);
  });

  it('rechaza una cantidad menor que 1', () => {
    expect(createCarSchema.safeParse({ ...valid, quantity: 0 }).success).toBe(false);
  });

  it('rechaza un brand_id que no es UUID', () => {
    expect(createCarSchema.safeParse({ ...valid, brand_id: 'hot-wheels' }).success).toBe(false);
  });

  it('rechaza un año anterior a 1900', () => {
    expect(createCarSchema.safeParse({ ...valid, year: 1850 }).success).toBe(false);
  });

  it('rechaza un año demasiado lejano en el futuro', () => {
    const farFuture = new Date().getFullYear() + 10;

    expect(createCarSchema.safeParse({ ...valid, year: farFuture }).success).toBe(false);
  });

  it('acepta el año que viene: los coleccionistas preordenan', () => {
    const nextYear = new Date().getFullYear() + 1;

    expect(createCarSchema.safeParse({ ...valid, year: nextYear }).success).toBe(true);
  });

  it('rechaza un año con decimales', () => {
    expect(createCarSchema.safeParse({ ...valid, year: 2024.5 }).success).toBe(false);
  });

  it('descarta los campos que no estan en el esquema', () => {
    const result = createCarSchema.parse({ ...valid, user_id: 'otra-persona', id: 'inventado' });

    expect(result).not.toHaveProperty('user_id');
    expect(result).not.toHaveProperty('id');
  });

  it('rechaza una descripcion que supera el limite', () => {
    const result = createCarSchema.safeParse({ ...valid, description: 'x'.repeat(1001) });

    expect(result.success).toBe(false);
  });
});

describe('updateCarSchema', () => {
  it('acepta un solo campo', () => {
    const result = updateCarSchema.parse({ quantity: 3 });

    expect(result).toEqual({ quantity: 3 });
  });

  it('NO rellena los campos ausentes con valores por defecto', () => {
    // Si `quantity` tuviera un default, un PATCH que solo cambia el modelo
    // reiniciaria silenciosamente la cantidad a 1.
    const result = updateCarSchema.parse({ model: '911 GT3 RS' });

    expect(result.quantity).toBeUndefined();
    expect(result.is_favorite).toBeUndefined();
  });

  it('distingue "no lo toques" (ausente) de "borralo" (null)', () => {
    expect(updateCarSchema.parse({ model: 'x' }).description).toBeUndefined();
    expect(updateCarSchema.parse({ description: null }).description).toBeNull();
  });

  it('rechaza un PATCH vacio', () => {
    expect(updateCarSchema.safeParse({}).success).toBe(false);
  });

  it('aplica los mismos limites que al crear', () => {
    expect(updateCarSchema.safeParse({ quantity: 0 }).success).toBe(false);
    expect(updateCarSchema.safeParse({ model: '' }).success).toBe(false);
  });
});
