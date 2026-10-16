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
- Las **utilidades** compartidas (paginación, envelope de errores, `AppError`)
  viven en `src/shared/`, nunca dentro de un módulo.
- La **composición de dominio entre módulos sí está permitida**, en una sola
  dirección: el *service* de un módulo puede usar el *repository* de otro.
  Ejemplo real: `cars.service` consulta `brands.repository` para comprobar que
  el fabricante existe y es visible antes de insertar.
  Lo que no se hace es llamar al *controller* o a las *rutas* de otro módulo:
  eso sería acoplarse a su capa HTTP.

  > Redacción corregida el 2026-09-30. La versión original decía que un módulo
  > "nunca se importa de otro", lo que habría obligado a duplicar la consulta de
  > marcas dentro de `cars` o a mover lógica de dominio a `shared/`. La
  > intención era hablar de utilidades, no de dominio.
- Si el proyecto creciera a decenas de módulos, el siguiente paso natural es
  extraerlos a paquetes del workspace, no volver a la organización por capas.
