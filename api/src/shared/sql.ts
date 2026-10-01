/**
 * En LIKE/ILIKE de PostgreSQL, `%` y `_` son comodines. Si el usuario busca
 * "911_GT3" espera un guion bajo literal, no "cualquier caracter", asi que hay
 * que escaparlos junto con la propia barra invertida.
 *
 * Esto NO es proteccion contra inyeccion: el valor viaja como parametro de
 * consulta y lo escapa el cliente de Supabase. Es correccion de la busqueda.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}
