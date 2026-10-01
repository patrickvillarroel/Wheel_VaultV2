import type { DbClient } from '../../config/supabase.js';
import { AppError } from '../../shared/errors/AppError.js';
import { escapeLikePattern } from '../../shared/sql.js';

/**
 * Acceso a datos de las marcas. No conoce HTTP ni reglas de negocio.
 *
 * Ninguna consulta filtra por usuario, y es correcto: la policy
 * `brands_select_global_or_own` ya devuelve el catalogo global mas las marcas
 * privadas de quien pregunta. Una marca privada de otra persona simplemente no
 * existe desde aqui.
 */

export interface BrandSummary {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

export interface BrandRow extends BrandSummary {
  description: string | null;
  /**
   * Conteo de autos incrustado. Al ejecutarse bajo la RLS de `cars`, cuenta
   * solo los autos DEL USUARIO que pregunta, que es justo lo que muestra la
   * pantalla de Marcas: esto es una coleccion personal, no un catalogo publico.
   */
  cars: { count: number }[];
}

const BRAND_SELECT = 'id, name, slug, description, logo_url, cars(count)';

/**
 * Catalogo completo visible para el usuario, ordenado por nombre.
 *
 * Sin paginacion a proposito: el catalogo esta acotado (32 marcas globales mas
 * las privadas del usuario) y las dos pantallas que lo consumen —el carrusel de
 * la Home y el selector de fabricante del formulario— necesitan la lista
 * entera. El tope es una red de seguridad, no una pagina.
 */
const MAX_BRANDS = 200;

export async function listVisible(db: DbClient, search?: string): Promise<BrandRow[]> {
  let query = db.from('brands').select(BRAND_SELECT);

  if (search) {
    query = query.ilike('name', `%${escapeLikePattern(search)}%`);
  }

  const { data, error } = await query.order('name').limit(MAX_BRANDS);

  if (error) {
    throw AppError.internal('Ha ocurrido un error inesperado', {
      operation: 'brands.listVisible',
      code: error.code,
      message: error.message,
    });
  }

  return data ?? [];
}

export async function findById(db: DbClient, brandId: string): Promise<BrandRow | null> {
  const { data, error } = await db
    .from('brands')
    .select(BRAND_SELECT)
    .eq('id', brandId)
    .maybeSingle();

  if (error) {
    throw AppError.internal('Ha ocurrido un error inesperado', {
      operation: 'brands.findById',
      code: error.code,
      message: error.message,
    });
  }

  return data;
}

/**
 * Comprobacion ligera de existencia y visibilidad, sin traerse el conteo.
 *
 * La usa `cars.service` antes de insertar: las claves foraneas se validan a
 * nivel de sistema y no ven la RLS, asi que sin esto un usuario podria apuntar
 * su auto a una marca privada ajena acertando el UUID.
 */
export async function findVisibleById(db: DbClient, brandId: string): Promise<BrandSummary | null> {
  const { data, error } = await db
    .from('brands')
    .select('id, name, slug, logo_url')
    .eq('id', brandId)
    .maybeSingle();

  if (error) {
    throw AppError.internal('Ha ocurrido un error inesperado', {
      operation: 'brands.findVisibleById',
      code: error.code,
      message: error.message,
    });
  }

  return data;
}
