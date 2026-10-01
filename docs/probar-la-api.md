# Probar la API a mano

Los tests automáticos verifican la capa que controlamos nosotros (autenticación,
validación, traducción de errores) con los repositorios simulados. Esto de aquí
es lo otro: comprobar que la API habla de verdad con tu base de datos.

Hazlo una vez ahora y repítelo cuando algo se comporte raro.

## 1. Arranca la API

```bash
npm run dev:api
```

Si falta algo en `api/.env`, el proceso muere diciéndote exactamente qué.

```bash
curl http://localhost:4000/health
```

## 2. Consigue un access token

La app móvil lo obtiene sola, pero para probar con `curl` hace falta pedirlo a
mano. Usa uno de los usuarios de prueba que creaste para el test de RLS.

Sustituye `TU_PROJECT` y `TU_ANON_KEY` por los valores de `api/.env`:

```bash
curl -s -X POST "https://TU_PROJECT.supabase.co/auth/v1/token?grant_type=password" -H "apikey: TU_ANON_KEY" -H "Content-Type: application/json" -d "{\"email\":\"test-a@wheelvault.test\",\"password\":\"LA_QUE_PUSISTE\"}"
```

De la respuesta copia el valor de `access_token`. Caduca en una hora; si empiezas
a recibir `AUTH_TOKEN_EXPIRED`, vuelve a pedirlo.

En PowerShell puedes guardarlo en una variable:

```bash
$TOKEN = "pega-aqui-el-access-token"
```

## 3. Comprueba la identidad

```bash
curl -s http://localhost:4000/api/v1/me -H "Authorization: Bearer $TOKEN"
```

Debe devolver tu `user.id`, tu `user.email` y el `profile` que creó el trigger al
registrarte. Si el perfil no aparece, el trigger `handle_new_user` no se aplicó.

## 4. El catálogo de marcas

```bash
curl -s http://localhost:4000/api/v1/brands -H "Authorization: Bearer $TOKEN"
```

Deben venir **32 marcas** ordenadas por nombre, cada una con `car_count: 0`
(todavía no tienes autos). Copia el `id` de Hot Wheels para el paso siguiente.

El filtro que usará el selector del formulario:

```bash
curl -s "http://localhost:4000/api/v1/brands?q=hot" -H "Authorization: Bearer $TOKEN"
```

> Si esta llamada falla con un error de PostgREST sobre `cars(count)`, avísame:
> el conteo usa una agregación incrustada que no pude verificar contra una base
> de datos real. La alternativa es una consulta aparte, y es un cambio pequeño.

## 5. Recorre el CRUD

Crear (sustituye `BRAND_ID`):

```bash
curl -s -i -X POST http://localhost:4000/api/v1/cars -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"brand_id\":\"BRAND_ID\",\"model\":\"911 GT3\",\"vehicle_make\":\"Porsche\",\"year\":2024,\"quantity\":2}"
```

Espera `201` y una cabecera `Location`. Copia el `id` de la respuesta.

Listar:

```bash
curl -s "http://localhost:4000/api/v1/cars?limit=20" -H "Authorization: Bearer $TOKEN"
```

Debe venir el auto con su `brand` incrustado (`{ id, name, slug, logo_url }`) y
un `meta` con `next_cursor` y `has_more`.

Ver uno, editar y borrar (sustituye `CAR_ID`):

```bash
curl -s http://localhost:4000/api/v1/cars/CAR_ID -H "Authorization: Bearer $TOKEN"
```

```bash
curl -s -X PATCH http://localhost:4000/api/v1/cars/CAR_ID -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"quantity\":5}"
```

```bash
curl -s -i -X DELETE http://localhost:4000/api/v1/cars/CAR_ID -H "Authorization: Bearer $TOKEN"
```

El `DELETE` responde `204` sin cuerpo. Repetirlo da `404`.

Después de crear el auto, vuelve a pedir el catálogo: la marca que usaste debe
mostrar ahora `car_count: 1`. Y los autos de esa marca:

```bash
curl -s "http://localhost:4000/api/v1/brands/BRAND_ID/cars" -H "Authorization: Bearer $TOKEN"
```

## 6. La prueba que de verdad importa

Pide un token del **segundo** usuario (`test-b@wheelvault.test`) y pídele un auto
creado por el primero:

```bash
curl -s http://localhost:4000/api/v1/cars/CAR_ID_DE_A -H "Authorization: Bearer $TOKEN_DE_B"
```

Tiene que responder:

```json
{"success":false,"error":{"code":"CAR_NOT_FOUND","message":"No se encontro el auto"},"request_id":"..."}
```

**404 y no 403.** Un 403 confirmaría que ese id existe. Prueba también el `PATCH`
y el `DELETE` con el token de B: los tres deben dar 404.

Si alguno devolviera los datos de A, para todo y dímelo.

Comprueba también el conteo: con el token de B, el catálogo de marcas debe
mostrar `car_count: 0` en la marca donde A tiene un auto. Si mostrara el conteo
de A, la agregación no estaría respetando la RLS.

## Qué comprobar cuando algo falle

| Síntoma | Causa probable |
|---|---|
| `AUTH_TOKEN_EXPIRED` | El token caducó. Pide otro (paso 2) |
| `AUTH_TOKEN_INVALID` | El token es de otro proyecto de Supabase, o `SUPABASE_URL` no coincide |
| `BRAND_NOT_FOUND` al crear | El `brand_id` no existe o es privado de otro usuario |
| `PROFILE_NOT_FOUND` en `/me` | El trigger `handle_new_user` no se aplicó; revisa la migración de `profiles` |
| `500 INTERNAL_ERROR` | Mira la terminal de la API: el detalle real está en el log, junto al `request_id` que te devolvió |
