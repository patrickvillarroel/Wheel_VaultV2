# ADR-006 — TanStack Query como capa de estado de servidor

**Estado:** aceptada · 2026-09-30

## Contexto

Casi todo el estado de esta app es **datos remotos**: la colección, el catálogo
de marcas, el perfil. El estado puramente de cliente se reduce a la sesión y a
lo que haya dentro de un formulario.

## Opciones

**A. Redux Toolkit (+ RTK Query)** — potente, pero mucha ceremonia para un
dominio tan pequeño; se acaba reimplementando caché y estados de carga a mano si
no se usa RTK Query.

**B. Context + `useState`/`useEffect`** — sin dependencias, pero obliga a
escribir a mano caché, reintentos, invalidación, deduplicación de peticiones y
estados de carga/error en cada pantalla. Es donde aparecen los bugs.

**C. TanStack Query** — resuelve exactamente ese problema.

## Decisión

Opción C para el estado de servidor. React Context **solo** para la sesión.
Nada de Redux.

## Razón

TanStack Query da de serie lo que el diseño ya pide: estados de carga para los
skeletons, estados de error con reintento, pull-to-refresh, invalidación tras
crear o editar un auto, y *optimistic updates* para el corazón de favorito y el
ajuste de cantidad (donde esperar a la red se nota).

Los formularios usan React Hook Form con los esquemas Zod de
`@wheel-vault/shared`, los mismos que valida la API.

## Consecuencias

- Claves de query convencionales: `['cars', filtros]`, `['car', id]`,
  `['brands']`, `['profile']`, `['stats']`.
- Tras cada mutación se invalidan las claves afectadas; nunca se escribe el
  resultado "a mano" en dos sitios.
- Al cerrar sesión se purga el cache por completo, para que el siguiente usuario
  en ese dispositivo no vea datos del anterior.
- La paginación usa `useInfiniteQuery` sobre los cursores de la API.
