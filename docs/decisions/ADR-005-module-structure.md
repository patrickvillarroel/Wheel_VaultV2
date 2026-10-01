# ADR-005 — Backend organizado por módulos, no por capas

**Estado:** aceptada · 2026-09-30

## Contexto

La estructura propuesta inicialmente agrupaba por capa técnica: `controllers/`,
`services/`, `routes/`, `repositories/`, `validators/` como carpetas hermanas.

## Decisión

Agrupar por **módulo de negocio**, con las capas co-localizadas dentro:

```
src/modules/cars/
   cars.routes.ts · cars.controller.ts · cars.service.ts
   cars.repository.ts · cars.schema.ts
```

## Razón

Añadir una feature (por ejemplo "wishlist") toca **una** carpeta en lugar de
cinco o seis. Al leer o revisar un módulo, todo su contexto está junto. Con 3–10
módulos, como aquí, la organización por capas solo añade saltos entre carpetas.

La separación de responsabilidades no cambia: el flujo sigue siendo estricto.

```
Route → Middleware → Controller → Service → Repository → Database
```

- El **controller** traduce HTTP ↔ dominio. No conoce Supabase.
- El **service** tiene las reglas de negocio. No conoce HTTP.
- El **repository** accede a los datos. No conoce HTTP ni reglas.

## Consecuencias

- `middleware/`, `config/` y `shared/` siguen siendo transversales.
- Lo compartido entre módulos (paginación, envelope de errores, `AppError`) vive
  en `src/shared/`, nunca se importa de un módulo a otro.
- Si el proyecto creciera a decenas de módulos, el siguiente paso natural es
  extraerlos a paquetes del workspace, no volver a la organización por capas.
