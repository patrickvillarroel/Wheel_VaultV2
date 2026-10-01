import type { DbClient } from '../../config/supabase.js';
import { AppError } from '../../shared/errors/AppError.js';

export interface BrandSummary {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

/**
 * Busca una marca que el usuario pueda ver.
 *
 * No hace falta filtrar aqui por "global o mia": la policy
 * `brands_select_global_or_own` ya lo impone en la base de datos. Si la marca
 * es privada de otro usuario, esta consulta devuelve null.
 *
 * Existe para poder responder un 404 claro antes de intentar el INSERT. Sin
 * esto, una brand_id ajena pasaria la comprobacion de clave foranea —las FK se
 * validan a nivel de sistema y no ven la RLS— y el auto quedaria apuntando a
 * una marca que su dueño no puede leer.
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
