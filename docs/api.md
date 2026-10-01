# API REST

Base: `/api/v1`. Todas las rutas requieren `Authorization: Bearer <access_token>`
salvo `/health`.

> **Estado**: `/health`, `/me` (fase 2) y `/cars` (fase 5) implementados.
> `/brands` llega en la fase 7, `/stats/summary` en la 8 y `/profile` en la 9.

## Autenticación

No hay endpoints de auth en Express. Registro, login, refresh, logout y reset de
contraseña los maneja la app contra Supabase Auth ([ADR-001](decisions/ADR-001-supabase-auth.md)).
Añadir endpoints espejo solo agregaría un salto de red y superficie de ataque.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/health` | Sin auth. Para el healthcheck del hosting |
| `GET` | `/me` | Sesión + perfil en una sola llamada (evita doble request al arrancar) |
| `GET` | `/cars` | Lista paginada. `?limit=&cursor=&brand_id=&q=&sort=recent\|oldest` |
| `POST` | `/cars` | Crea. `201` + header `Location` |
| `GET` | `/cars/:id` | Detalle |
| `PATCH` | `/cars/:id` | Actualización **parcial** |
| `DELETE` | `/cars/:id` | `204` |
| `GET` | `/brands` | Catálogo + `car_count` (de *mis* autos) |
| `GET` | `/brands/:id` | Detalle + `car_count` |
| `GET` | `/brands/:id/cars` | Mis autos de esa marca, misma paginación que `/cars` |
| `GET` | `/profile` | Perfil |
| `PATCH` | `/profile` | Edita `display_name` (y `bio` más adelante) |
| `GET` | `/stats/summary` | Home: totales + últimos agregados, en un request |

**PATCH y no PUT**: con PUT el cliente debe reenviar el recurso completo y puede
borrar campos sin querer. En una pantalla de edición parcial, PATCH es lo
correcto.

El email no se edita por aquí: lo cambia Supabase Auth con su propio flujo de
confirmación.

## Formato de respuesta

**Éxito**

```jsonc
{
  "success": true,
  "data": { },
  "meta": { "next_cursor": "eyJjIjoiMjAyNi0wOS0zMCJ9", "has_more": true }
}
```

**Error**

```jsonc
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos enviados no son validos",
    "details": [{ "field": "quantity", "message": "Debe ser mayor o igual a 1" }]
  },
  "request_id": "01J8ZQ..."
}
```

`request_id` es el puente entre lo que ve el usuario y la línea del log. El
detalle interno (stack trace, error de Postgres, ruta de archivo) **nunca** sale
al cliente.

## Códigos

| HTTP | `code` | Cuándo |
|---|---|---|
| 400 | `VALIDATION_ERROR` | JSON malformado |
| 401 | `AUTH_TOKEN_MISSING` / `AUTH_TOKEN_INVALID` / `AUTH_TOKEN_EXPIRED` | Sin token, alterado o caducado |
| 403 | `FORBIDDEN` | Autenticado pero sin permiso |
| 404 | `CAR_NOT_FOUND` / `BRAND_NOT_FOUND` / `PROFILE_NOT_FOUND` | No existe **o no es tuyo** |
| 409 | `BRAND_NAME_TAKEN` | Ya tienes una marca con ese nombre |
| 409 | `BRAND_HAS_CARS` | Intento de borrar una marca con autos |
| 422 | `VALIDATION_ERROR` | JSON válido, contenido inválido |
| 429 | `RATE_LIMITED` | Límite de peticiones |
| 500 | `INTERNAL_ERROR` | Error no previsto |

Los códigos viven en `shared/src/errors.ts`, así que el móvil los importa y no
los copia a mano.

**Un recurso ajeno responde 404, no 403**: un 403 confirmaría que ese id existe.

## Paginación

Keyset (cursor), no offset. El cursor es opaco (base64 de
`created_at` + `id`) y el cliente solo lo reenvía tal cual.

```
GET /api/v1/cars?limit=20
GET /api/v1/cars?limit=20&cursor=eyJjIjoiMjAyNi0wOS0zMFQxMjowMDowMFoiLCJpIjoiLi4uIn0
```

`limit` por defecto 20, máximo 50 (`PAGINATION` en `shared/src/limits.ts`).

El cursor incluye `created_at` **y** `id`: dos autos creados en el mismo
milisegundo empatarían y uno se perdería entre páginas.

No es un secreto ni un control de acceso. Manipularlo solo permite empezar a
paginar desde otro punto de los datos **del propio usuario**, porque la consulta
sigue filtrando por `user_id` y la RLS sigue activa. Se valida para responder un
422 claro en lugar de producir una consulta extraña.

**`sort` solo acepta `recent` y `oldest`.** Ordenar por nombre necesita un
cursor compuesto sobre `(model, id)`, y el modelo es texto libre del usuario:
construir ese filtro obliga a escapar comas, paréntesis y comillas dentro de la
sintaxis `or=()` de PostgREST, y equivocarse ahí es un fallo de filtrado. Ninguna
pantalla del diseño lo pide, así que entrará junto a la función de búsqueda.

Con offset, la página 50 obliga a Postgres a leer y descartar 1 000 filas, y si
se inserta un auto mientras paginas, los elementos se duplican o se saltan. El
keyset no tiene ninguno de los dos problemas y aquí no cuesta más: el índice
`cars_user_created_idx` ya está en ese orden.

## Validación

Zod en **body, params y query**. Los límites se importan de
`@wheel-vault/shared`, de modo que el móvil y la API validan exactamente lo
mismo, y los CHECK de PostgreSQL son la tercera red.

| Campo | Regla |
|---|---|
| `model` | 1..100, requerido |
| `vehicle_make` | ≤ 60, opcional |
| `year` | entero, 1900..(año actual + 2), opcional |
| `description` | ≤ 1000, opcional |
| `quantity` | entero, 1..9999 |
| `brand_id` | UUID existente y visible para el usuario |
| `display_name` | 2..50 |
| `limit` | entero, 1..50 |
