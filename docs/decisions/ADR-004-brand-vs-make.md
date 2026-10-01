# ADR-004 — `brand_id` (fabricante del diecast) separado de `vehicle_make` (auto real)

**Estado:** aceptada · 2026-09-30

## Contexto

La especificación listaba a la vez `marca`, `brand_id` y `fabricante` como
campos del auto. El diseño en Figma reveló que ahí conviven **dos conceptos
distintos**:

- La sección "Marcas" muestra Matchbox, Hot Wheels, Maisto, Bburago, Mini GT →
  fabricantes del *modelo a escala*.
- Las tarjetas de "Agregados recientes" muestran `Porsche 911 GT3 / Maisto` →
  el título es el *auto real*, el subtítulo el fabricante del diecast.

## Decisión

Tres campos con responsabilidades separadas:

| Concepto | Ejemplo | Columna |
|---|---|---|
| Fabricante del modelo a escala | Hot Wheels, Maisto | `cars.brand_id` → FK a `brands` |
| Marca del vehículo real | Porsche, Nissan | `cars.vehicle_make` (texto) |
| Modelo del vehículo | 911 GT3, Skyline GT-R | `cars.model` |

`marca` y `fabricante` **desaparecen** como columnas: la primera duplicaba
`brand_id`, el segundo queda absorbido por él.

Confirmado con el propietario del producto el 2026-09-30.

## Consecuencias

- No existe una columna de texto con el nombre de la marca junto a `brand_id`:
  duplicarlo permitiría que ambos valores se desincronizaran. El nombre se
  obtiene con un JOIN.
- `vehicle_make` es texto libre en el MVP. Si más adelante se quiere filtrar por
  marca de vehículo con fiabilidad, se normaliza a su propia tabla; mantenerlo
  como texto ahora evita pedirle al usuario que mantenga dos catálogos.
- La UI debe dejar clara la diferencia en el formulario: "Fabricante (Hot
  Wheels)" frente a "Marca del vehículo (Porsche)". Es el punto donde un usuario
  se puede confundir.
