import { ERROR_CODES } from '@wheel-vault/shared';
import type { PostgrestError } from '@supabase/supabase-js';
import type { DbClient } from '../../config/supabase.js';
import type { TablesInsert, TablesUpdate } from '../../types/database.types.js';
import { AppError } from '../../shared/errors/AppError.js';
import type { Cursor } from '../../shared/pagination.js';
import { escapeLikePattern } from '../../shared/sql.js';

/**
 * Acceso a datos de los autos. No conoce HTTP ni reglas de negocio.
 *
 * TODAS las consultas filtran por user_id ademas de llevar la RLS detras. La
 * redundancia es deliberada: la consulta debe ser correcta por si misma y la
 * base de datos es la red de seguridad, no el filtro principal (ADR-002).
 */

const CAR_SELECT =
  'id, model, vehicle_make, year, description, quantity, is_favorite, image_path, created_at, updated_at, brand:brands(id, name, slug, logo_url)';

export interface CarRow {
  id: string;
  model: string;
  vehicle_make: string | null;
  year: number | null;
  description: string | null;
  quantity: number;
  is_favorite: boolean;
  image_path: string | null;
  created_at: string;
  updated_at: string;
  brand: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
  } | null;
}

export interface ListParams {
  brandId?: string | undefined;
  search?: string | undefined;
  ascending: boolean;
  cursor?: Cursor | undefined;
  /** El servicio pide una fila de más para saber si hay pagina siguiente. */
  limit: number;
}

/** Código de PostgreSQL para violacion de clave foranea. */
const FOREIGN_KEY_VIOLATION = '23503';

function fail(operation: string, error: PostgrestError): never {
  if (error.code === FOREIGN_KEY_VIOLATION && error.message.includes('brand_id')) {
    throw AppError.notFound(ERROR_CODES.BRAND_NOT_FOUND, 'El fabricante indicado no existe');
  }

  throw AppError.internal('Ha ocurrido un error inesperado', {
    operation,
    code: error.code,
    message: error.message,
  });
}

export async function list(db: DbClient, userId: string, params: ListParams): Promise<CarRow[]> {
  let query = db.from('cars').select(CAR_SELECT).eq('user_id', userId);

  if (params.brandId) {
    query = query.eq('brand_id', params.brandId);
  }

  if (params.search) {
    query = query.ilike('model', `%${escapeLikePattern(params.search)}%`);
  }

  if (params.cursor) {
    // Keyset: "las filas posteriores a la última que te di". El desempate por
    // id evita perder autos creados en el mismo instante.
    const { createdAt, id } = params.cursor;
    const op = params.ascending ? 'gt' : 'lt';
    query = query.or(
      `created_at.${op}.${createdAt},and(created_at.eq.${createdAt},id.${op}.${id})`,
    );
  }

  const { data, error } = await query
    .order('created_at', { ascending: params.ascending })
    .order('id', { ascending: params.ascending })
    .limit(params.limit);

  if (error) fail('cars.list', error);

  return data ?? [];
}

/**
 * Cuántos autos tiene el usuario.
 *
 * `head: true` pide solo la cabecera con el conteo: no transfiere ni una fila,
 * que es justo lo que se necesita para un numero en la pantalla de inicio.
 */
export async function countForUser(db: DbClient, userId: string): Promise<number> {
  const { count, error } = await db
    .from('cars')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) fail('cars.countForUser', error);

  return count ?? 0;
}

export interface Totals {
  /** Filas: cuantos modelos distintos. */
  models: number;
  /** Suma de `quantity`: cuantas piezas en total. */
  units: number;
}

/**
 * Los dos numeros de la cabecera del inventario, para unos filtros dados.
 *
 * No se calcula dentro de `list` porque alli hay un cursor: el conteo saldria
 * "lo que queda despues de esta pagina", no el total.
 *
 * El conteo de filas no transfiere datos (`head: true`). La suma si: PostgREST
 * solo expone funciones de agregacion si estan habilitadas en el proyecto, asi
 * que en vez de depender de eso se traen las cantidades —una columna de
 * enteros— y se suman aqui. Para una coleccion personal son unos pocos KB; si
 * algun dia crecen a decenas de miles de filas, esto pasa a ser una funcion SQL.
 */
export async function totalsForFilters(
  db: DbClient,
  userId: string,
  params: Pick<ListParams, 'brandId' | 'search'>,
): Promise<Totals> {
  function base() {
    let query = db.from('cars').select('quantity').eq('user_id', userId);

    if (params.brandId) query = query.eq('brand_id', params.brandId);
    if (params.search) query = query.ilike('model', `%${escapeLikePattern(params.search)}%`);

    return query;
  }

  const { data, error } = await base();

  if (error) fail('cars.totalsForFilters', error);

  const rows = data ?? [];

  return {
    models: rows.length,
    units: rows.reduce((total, row) => total + row.quantity, 0),
  };
}

export async function findById(
  db: DbClient,
  userId: string,
  carId: string,
): Promise<CarRow | null> {
  const { data, error } = await db
    .from('cars')
    .select(CAR_SELECT)
    .eq('id', carId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) fail('cars.findById', error);

  return data ?? null;
}

export async function insert(db: DbClient, values: TablesInsert<'cars'>): Promise<CarRow> {
  const { data, error } = await db.from('cars').insert(values).select(CAR_SELECT).single();

  if (error) fail('cars.insert', error);

  return data;
}

/**
 * Devuelve null si no se actualizo nada: o el auto no existe, o no es de este
 * usuario. Desde fuera son el mismo caso a proposito (404 en ambos), para no
 * confirmar que un id ajeno existe.
 */
export async function update(
  db: DbClient,
  userId: string,
  carId: string,
  patch: TablesUpdate<'cars'>,
): Promise<CarRow | null> {
  const { data, error } = await db
    .from('cars')
    .update(patch)
    .eq('id', carId)
    .eq('user_id', userId)
    .select(CAR_SELECT)
    .maybeSingle();

  if (error) fail('cars.update', error);

  return data ?? null;
}

/** `true` si se borro algo; `false` si no había nada que borrar. */
export async function remove(db: DbClient, userId: string, carId: string): Promise<boolean> {
  const { data, error } = await db
    .from('cars')
    .delete()
    .eq('id', carId)
    .eq('user_id', userId)
    .select('id');

  if (error) fail('cars.remove', error);

  return (data ?? []).length > 0;
}
