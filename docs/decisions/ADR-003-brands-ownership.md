# ADR-003 — Marcas híbridas: catálogo global + marcas privadas

**Estado:** aceptada · 2026-09-30

## Contexto

Los fabricantes de modelos a escala (Hot Wheels, Matchbox, Maisto) son entidades
del mundo real, iguales para todos los usuarios. Pero el catálogo nunca estará
completo: un coleccionista puede tener piezas de marcas oscuras o regionales.

## Opciones

**A. Globales** — catálogo curado, solo lectura.

- ✅ Sin duplicados ("hot wheels" / "Hot Wheels" / "HotWheels"), logos
  consistentes, estadísticas agregadas posibles, pantalla de Marcas idéntica al
  diseño.
- ❌ Si falta una marca, el usuario queda bloqueado hasta que se añada.

**B. Creadas por cada usuario.**

- ✅ Libertad total.
- ❌ Duplicados masivos, sin logos, la pantalla de Marcas pierde su identidad
  visual.

**C. Híbrida** — `created_by` nullable.

- ✅ Catálogo curado + vía de escape.
- ✅ Es una columna y dos policies; se decide ahora y se expone en la UI cuando
  haga falta.

## Decisión

Opción C.

- `created_by IS NULL` → marca global, visible para todos, modificable solo por
  migración.
- `created_by = <uuid>` → marca privada de ese usuario.

En el MVP se siembran 32 marcas globales y **no se expone UI** para crear
privadas: con un catálogo decente no hace falta, y la base de datos ya está
lista para cuando sí.

## Consecuencias

- Índices únicos parciales separados por ámbito, para que una marca privada no
  choque con una global ni permita duplicar el catálogo.
- El catálogo se inserta en una migración (no en `seed.sql`) porque en
  producción es un dato obligatorio, y **antes** de activar la RLS, ya que la
  policy de INSERT exige `created_by = auth.uid()`.
- El conteo de modelos que muestra cada tarjeta de marca es el de **los autos
  del usuario**, no un total global: es una colección personal. Con la RLS
  activa, el `count` sale ya filtrado.
