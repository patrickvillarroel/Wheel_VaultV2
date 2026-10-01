# Arquitectura

## Visión general

```
┌──────────────────────────────────────────┐
│  React Native + Expo (TypeScript)        │
│  Nunca contiene: service_role, JWT       │
│  secret, credenciales de base de datos   │
└───────┬──────────────────────────┬────────┘
        │                          │
        │ (1) signUp / signIn /    │ (2) Negocio: cars, brands,
        │     refresh / reset      │     profile — HTTPS + Bearer
        ▼                          ▼
┌────────────────┐        ┌─────────────────────────────┐
│ Supabase Auth  │        │  Express API (TypeScript)   │
│ (GoTrue)       │        │  helmet · cors · rate-limit │
└───────┬────────┘        │  requireAuth (verifica JWT) │
        │ emite JWT       │  Zod · controller→service   │
        │ sub = user id   │      →repository            │
        │                 └──────────┬──────────────────┘
        │                            │ anon key + JWT del usuario
        └────────────────────────────┤
                                     ▼
                      ┌──────────────────────────────┐
                      │ Supabase / PostgreSQL        │
                      │ RLS: auth.uid() = user_id    │
                      └──────────────────────────────┘
```

Dos caminos, uno para cada responsabilidad:

1. **Autenticación**: la app habla directo con Supabase Auth. El SDK gestiona el
   access token (1 h), el refresh token y su rotación, y los guarda en
   `expo-secure-store`. Ver [ADR-001](decisions/ADR-001-supabase-auth.md).
2. **Negocio**: todo lo demás pasa por Express, que valida, aplica reglas y
   consulta a Postgres **propagando el JWT del usuario**, de modo que la RLS
   sigue activa. Ver [ADR-002](decisions/ADR-002-jwt-propagation.md).

La app móvil **nunca** escribe en `cars`, `brands` ni `profiles` directamente.

## Flujo de un request

```
Route
  → rateLimit        (límite por IP)
  → requireAuth      (verifica firma, exp, iss, aud → req.user.id)
  → validate(Zod)    (body, params, query)
  → Controller       (traduce HTTP ↔ dominio; no conoce Supabase)
  → Service          (reglas de negocio; no conoce HTTP)
  → Repository       (acceso a datos; no conoce HTTP ni reglas)
  → Supabase/Postgres (RLS como última defensa)
```

Regla: `user_id` **siempre** viene de `req.user.id`, nunca del body o la query.

## Estructura del backend

```
api/src/
├─ config/       env.ts · supabase.ts · logger.ts
├─ middleware/   requireAuth · validate · errorHandler · notFound
│                rateLimit · requestContext
├─ modules/
│  ├─ cars/      cars.routes · cars.controller · cars.service
│  │             cars.repository · cars.schema
│  ├─ brands/
│  └─ profile/
├─ shared/       errors/AppError · http/envelope · pagination
├─ types/        database.types.ts (generado: npm run db:types)
├─ app.ts
└─ server.ts
```

Agrupamos **por módulo** y no por capa técnica
([ADR-005](decisions/ADR-005-module-structure.md)): añadir una feature toca una
carpeta, no seis. Las capas siguen existiendo, solo que colocadas juntas.

## Estructura del frontend

```
mobile/
├─ app/                      Expo Router — solo rutas, archivos finos
│  ├─ _layout.tsx            providers + gate de sesión
│  ├─ (auth)/                login · register · forgot-password · reset-password
│  ├─ (tabs)/                _layout · index (Home) · collection · more
│  ├─ car/[id].tsx · car/new.tsx · car/[id]/edit.tsx
│  ├─ brands/index.tsx · brands/[id].tsx
│  └─ profile/index.tsx · profile/edit.tsx
└─ src/
   ├─ features/              auth/ cars/ brands/ profile/
   │                         └ api.ts · hooks.ts · schema.ts · components/
   ├─ components/ui/         Button · Input · Card · EmptyState · ErrorState
   │                         Skeleton · SectionHeader · ConfirmDialog
   ├─ lib/                   supabase.ts · apiClient.ts · queryClient.ts
   ├─ theme/                 colors · typography · spacing · radii
   ├─ hooks/ · utils/ · constants/ · types/
   └─ config/                env.ts
```

- **Estado del servidor**: TanStack Query. Estado global propio solo para la
  sesión (Context). Sin Redux: no hay estado cliente que lo justifique.
- **Formularios**: React Hook Form + los mismos esquemas Zod del backend, vía
  el workspace `shared/`. Una sola fuente de verdad para los límites.
- **Listas**: FlashList en inventario y en autos por marca.
- **Estilos**: StyleSheet + tokens propios. Sin librería de UI genérica: el
  diseño es muy específico y pelearía con ella.

## Navegación

```
_layout (AuthProvider + QueryProvider)
   ├─ sin sesión → (auth): login ⇄ register ⇄ forgot-password → reset-password
   └─ con sesión → (tabs)
         ├─ Inicio     → resumen · "Ver todas" marcas → brands/ · auto → car/[id]
         ├─ Colección  → lista + filtro por marca · FAB → car/new
         └─ Más        → profile/ → profile/edit · Logout
```

Tabs del MVP: **Inicio · Colección · Más**. *Buscar* y *Favoritos* existen en el
diseño pero se añaden cuando tengan contenido real; `cars.is_favorite` ya está
en la base de datos, así que no habrá migración.

## Roadmap

| Fase | Contenido | Estado |
|---|---|---|
| 0 | Fundaciones: monorepo, TS estricto, lint, env, docs | ✅ |
| 1 | Base de datos: tablas, constraints, índices, triggers, RLS, catálogo | ✅ |
| 2 | Backend core: helmet/cors/rate-limit, requireAuth, validate, errorHandler, `/me` | ✅ |
| 3 | Auth móvil: SecureStore, AuthContext, login/registro/reset, gate de rutas | ⬜ |
| 4 | Design system: tokens y componentes base del Figma | ⬜ |
| 5 | Cars API: CRUD, paginación keyset, filtros, tests de autorización | ✅ |
| 5.5 | Fotos: Storage, subida, compresión, URLs firmadas | ⬜ |
| 6 | Inventario UI: lista, detalle, crear, editar, borrar, estados | ⬜ |
| 7 | Brands: API + pantallas + conteos | ⬜ |
| 8 | Home: `/stats/summary` + dashboard | ⬜ |
| 9 | Perfil: ver, editar, logout | ⬜ |
| 10 | Hardening: seguridad, auditoría, logs, accesibilidad, build EAS | ⬜ |

## Decisiones registradas

| ADR | Decisión |
|---|---|
| [001](decisions/ADR-001-supabase-auth.md) | Supabase Auth como único proveedor de identidad |
| [002](decisions/ADR-002-jwt-propagation.md) | Express propaga el JWT del usuario, no usa service_role |
| [003](decisions/ADR-003-brands-ownership.md) | Marcas híbridas: catálogo global + privadas por usuario |
| [004](decisions/ADR-004-brand-vs-make.md) | `brand_id` (diecast) separado de `vehicle_make` (auto real) |
| [005](decisions/ADR-005-module-structure.md) | Backend organizado por módulos, no por capas |
| [006](decisions/ADR-006-server-state.md) | TanStack Query como capa de estado de servidor |
