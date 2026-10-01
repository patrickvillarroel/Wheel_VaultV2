# Collector's Project

App móvil para administrar una colección de carros a escala. Cada usuario tiene
su propio inventario y solo puede ver y modificar lo que le pertenece.

> **Estado actual: fases 0, 1, 2 y 5 completadas** — fundaciones, base de datos
> con RLS, núcleo del backend y API de autos. La app móvil llega en la fase 3.
> Roadmap completo en [docs/architecture.md](docs/architecture.md).

## Stack

| Capa | Tecnología |
|---|---|
| Móvil | React Native · Expo · TypeScript · Expo Router |
| API | Node.js · Express 5 · TypeScript · Zod |
| Datos | Supabase · PostgreSQL · Row Level Security |
| Identidad | Supabase Auth (JWT) |

## Estructura

```
.
├─ api/          Backend Express (TypeScript)
├─ mobile/       App React Native + Expo       ← se genera en la fase 3
├─ shared/       Límites de validación y códigos de error compartidos
├─ supabase/
│  ├─ migrations/   Esquema de la base de datos (SQL)
│  └─ tests/        Pruebas de aislamiento entre usuarios (RLS)
└─ docs/
   ├─ supabase-setup.md   Guía de Supabase desde cero
   ├─ probar-la-api.md    Cómo verificar la API a mano con curl
   ├─ architecture.md     Arquitectura y roadmap
   ├─ database.md         Modelo de datos, índices y policies
   ├─ security.md         Controles de seguridad
   ├─ api.md              Contrato de la API REST
   └─ decisions/          ADR — por qué cada decisión importante
```

## Puesta en marcha

Requisitos: **Node.js 20 o superior** y una cuenta de Supabase (gratuita).

```bash
npm install
```

```bash
cp api/.env.example api/.env
```

Luego sigue **[docs/supabase-setup.md](docs/supabase-setup.md)** para crear el
proyecto de Supabase, rellenar `api/.env`, aplicar las migraciones y verificar
que el aislamiento entre usuarios funciona. Es la guía principal si nunca has
usado Supabase.

Con eso listo:

```bash
npm run dev:api
```

```bash
curl http://localhost:4000/health
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev:api` | Levanta la API en modo watch |
| `npm run build` | Compila `shared` y `api` |
| `npm run typecheck` | Comprueba los tipos de todos los workspaces |
| `npm run lint` · `npm run lint:fix` | ESLint |
| `npm run format` | Prettier |
| `npm test` | Tests de todos los workspaces |
| `npm run db:types` | Regenera los tipos TypeScript desde el esquema (requiere `supabase link`) |

## Reglas del proyecto

1. `service_role key` y `JWT secret` **solo** en `api/.env`. Nunca en la app
   móvil, nunca en Git.
2. Ninguna tabla nueva sin su RLS y sus policies **en la misma migración**.
3. El esquema no se edita desde el dashboard: todo cambio es una migración.
4. Después de tocar el esquema: `npm run db:types` y volver a correr
   `supabase/tests/rls_isolation.sql`.
5. `user_id` siempre sale del token, nunca del body o la query.

## Git

```
main                 ← releases
└─ develop           ← integración
   ├─ feature/<fase>
   └─ fix/<asunto>
```

Commits en formato Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`,
`chore:`, `test:`.
