# ADR-002 — Express propaga el JWT del usuario; no usa `service_role`

**Estado:** aceptada · 2026-09-30

## Contexto

Express necesita consultar Supabase. La forma de autenticarse contra la base de
datos decide si la RLS sirve de algo o es decorativa.

## Opciones

**A. Express usa `SERVICE_ROLE_KEY`**

- ✅ Simple y rápido.
- ❌ La service role key tiene `BYPASSRLS`: **ignora todas las policies**. Un
  solo `WHERE user_id` olvidado en un service equivale a una fuga de datos entre
  usuarios, y la RLS no lo impediría.

**B. Express crea un cliente por request con la `ANON_KEY` y el JWT del usuario**

- ✅ La RLS se aplica siempre. Incluso un `SELECT * FROM cars` sin filtro
  devuelve únicamente las filas del usuario autenticado.
- ✅ Cumple el requisito de no depender solo del backend para el control de
  acceso.
- ❌ Instanciar un cliente por request (coste despreciable).
- ❌ Sin pool de conexiones propio; se pasa por PostgREST.

## Decisión

Opción B. `SERVICE_ROLE_KEY` queda reservada a tareas administrativas fuera del
camino de un request de usuario (scripts de mantenimiento, backfills).

## Consecuencias

- `api/src/config/supabase.ts` expone `createUserClient(accessToken)`.
- El cliente admin, si llega a existir, vivirá fuera de `src/modules/` y una
  regla de ESLint (`no-restricted-imports`, ya configurada en
  `eslint.config.mjs`) impide importarlo desde la lógica de negocio.
- Los repositories **igualmente** filtran por `user_id`: la RLS es la red de
  seguridad, no el mecanismo principal.
- La latencia añadida por el salto extra se mitiga desplegando Express en la
  misma región que el proyecto Supabase.
