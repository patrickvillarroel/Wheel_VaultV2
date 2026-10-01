# Probar la API contra la base de datos real

Los tests de `npm test` simulan los repositorios: verifican nuestra lógica, no
la de PostgreSQL. Esto de aquí es lo otro — comprobar que la API habla de verdad
con tu Supabase y que el aislamiento entre usuarios se cumple de extremo a
extremo.

## Antes de empezar

**1. Dos usuarios de prueba.** En el dashboard:
**Authentication → Users → Add user → Create new user**, marcando
**Auto Confirm User**. Crea dos, por ejemplo `test-a@wheelvault.test` y
`test-b@wheelvault.test`.

Usa cuentas creadas solo para esto. Nunca una cuenta real.

**2. La API corriendo**, en una terminal aparte:

```bash
npm run dev:api
```

Si falta algo en `api/.env`, el proceso muere diciéndote exactamente qué.

## La forma rápida

En otra terminal:

```bash
npm run smoke
```

Te pedirá el email y la contraseña de los dos usuarios. No se guardan ni se
imprimen en ninguna parte.

El script recorre unas 40 comprobaciones: identidad y perfil, catálogo de
marcas, CRUD completo, paginación, edición parcial y —lo importante— la sección
**7. AISLAMIENTO ENTRE USUARIOS**, donde intenta con el token de B leer,
modificar y borrar un auto de A. Al terminar limpia lo que creó.

Resultado esperado:

```
====================================================
 TODO CORRECTO — 40 comprobaciones
====================================================
```

Si algo falla, el script lo nombra y te dice qué significa. **Pásame esa salida
tal cual.**

Para repetirlo sin teclear las credenciales cada vez, exporta
`SMOKE_A_EMAIL`, `SMOKE_A_PASSWORD`, `SMOKE_B_EMAIL` y `SMOKE_B_PASSWORD`.

> Conviene volver a ejecutarlo después de cada migración y cada vez que se toque
> una policy.

## A mano, con curl

Útil para depurar un endpoint concreto cuando el script señala un fallo.

### 1. Consigue un access token

Sustituye `TU_PROJECT` y `TU_ANON_KEY` por los valores de `api/.env`:

```bash
curl -s -X POST "https://TU_PROJECT.supabase.co/auth/v1/token?grant_type=password" -H "apikey: TU_ANON_KEY" -H "Content-Type: application/json" -d "{\"email\":\"test-a@wheelvault.test\",\"password\":\"LA_QUE_PUSISTE\"}"
```

Copia el `access_token` de la respuesta. Caduca en una hora; si empiezas a
recibir `AUTH_TOKEN_EXPIRED`, pide otro.

En PowerShell:

```bash
$TOKEN = "pega-aqui-el-access-token"
```

### 2. Identidad

```bash
curl -s http://localhost:4000/api/v1/me -H "Authorization: Bearer $TOKEN"
```

Debe traer tu `user.id`, tu `user.email` y el `profile` que creó el trigger al
registrarte.

### 3. Marcas

```bash
curl -s http://localhost:4000/api/v1/brands -H "Authorization: Bearer $TOKEN"
```

32 marcas ordenadas por nombre, cada una con su `car_count`. Copia un `id`.

### 4. CRUD

```bash
curl -s -i -X POST http://localhost:4000/api/v1/cars -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"brand_id\":\"BRAND_ID\",\"model\":\"911 GT3\",\"vehicle_make\":\"Porsche\",\"year\":2024,\"quantity\":2}"
```

```bash
curl -s "http://localhost:4000/api/v1/cars?limit=20" -H "Authorization: Bearer $TOKEN"
```

```bash
curl -s -X PATCH http://localhost:4000/api/v1/cars/CAR_ID -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"quantity\":5}"
```

```bash
curl -s -i -X DELETE http://localhost:4000/api/v1/cars/CAR_ID -H "Authorization: Bearer $TOKEN"
```

El `DELETE` responde `204` sin cuerpo. Repetirlo da `404`.

### 5. Aislamiento

Con un token del **segundo** usuario, pide un auto del primero:

```bash
curl -s http://localhost:4000/api/v1/cars/CAR_ID_DE_A -H "Authorization: Bearer $TOKEN_DE_B"
```

Debe responder **404 `CAR_NOT_FOUND`**, no 403: un 403 confirmaría que ese id
existe. Lo mismo con `PATCH` y `DELETE`.

## Si algo falla

| Síntoma | Causa probable |
|---|---|
| `AUTH_TOKEN_EXPIRED` | El token caducó. Pide otro |
| `AUTH_TOKEN_INVALID` | El token es de otro proyecto, o `SUPABASE_URL` no coincide |
| `BRAND_NOT_FOUND` al crear | El `brand_id` no existe o es privado de otro usuario |
| `PROFILE_NOT_FOUND` en `/me` | El trigger `handle_new_user` no se aplicó; revisa la migración de `profiles` |
| Error de PostgREST sobre `cars(count)` | La agregación incrustada del `car_count` no es compatible. Dímelo: la alternativa es una consulta aparte |
| `500 INTERNAL_ERROR` | Mira la terminal de la API: el detalle real está en el log, junto al `request_id` que te devolvió |
