# Supabase desde cero

Guía para alguien que nunca ha usado Supabase. Al terminar tendrás la base de
datos del proyecto creada, protegida y verificada.

Tiempo estimado: 30–40 minutos.

---

## 0. ¿Qué es Supabase, en una frase?

Es un **PostgreSQL alojado en la nube** con tres cosas construidas encima que
nosotros vamos a usar:

| Pieza | Qué hace | Cómo la usamos |
|---|---|---|
| **Database** | Un Postgres normal y corriente | Aquí viven `profiles`, `brands`, `cars` |
| **Auth** | Registro, login, tokens, reset de contraseña | La app móvil habla directo con esto (ADR-001) |
| **Storage** | Archivos (fotos), con permisos por usuario | Las fotos de los autos (fase 5.5) |

Lo importante: **no es una base de datos "mágica"**. Todo lo que escribimos en
`supabase/migrations/` es SQL estándar de PostgreSQL. Si algún día quieres
mudarte a otro proveedor, ese SQL se lleva contigo.

### El concepto que más cuesta al principio: RLS

En una app tradicional, la base de datos confía ciegamente en el backend:

```
"dame todos los autos"  →  la BD devuelve TODOS los autos de TODOS los usuarios
                           (el backend debe acordarse de filtrar)
```

Con **Row Level Security** activada, la base de datos pregunta primero *quién
eres*:

```
"dame todos los autos"  →  la BD aplica la policy: user_id = auth.uid()
                           →  devuelve solo los TUYOS
```

Si un día olvidamos un `WHERE user_id = ...` en el backend, **no pasa nada**:
la base de datos no entrega filas ajenas. Eso es lo que prueba
`supabase/tests/rls_isolation.sql`.

`auth.uid()` es una función que lee el **token JWT** que viene con la petición y
devuelve el UUID del usuario. Si no hay token, devuelve `NULL` y ninguna policy
se cumple.

---

## 1. Crear la cuenta y el proyecto

1. Entra a <https://supabase.com> → **Start your project** → inicia sesión con
   GitHub (es lo más cómodo).
2. **New project**. Rellena:
   - **Name**: `wheel-vault-dev`
   - **Database Password**: pulsa *Generate a password* y **guárdala en tu gestor
     de contraseñas ahora mismo**. Es la contraseña del superusuario de Postgres.
     No se puede volver a ver (sí resetear, pero es un fastidio).
   - **Region**: la más cercana a ti. Esto define la latencia de toda la app.
   - **Plan**: Free. Sobra de largo para el MVP.
3. Espera ~2 minutos a que termine de aprovisionar.

> **Sobre el plan Free**: un proyecto sin actividad durante 7 días se pausa. Se
> reanuda con un clic, no se pierde nada. Más adelante crearemos un segundo
> proyecto `wheel-vault-prod` para producción; nunca se desarrolla contra la
> base de datos de producción.

---

## 2. Recorrido rápido del dashboard

En la barra lateral izquierda vas a usar sobre todo estas cuatro:

- **Table Editor** — ver y editar los datos como si fuera una hoja de cálculo.
- **SQL Editor** — ejecutar SQL a mano. Aquí correremos las pruebas de RLS.
- **Authentication** — los usuarios registrados y la configuración del login.
- **Project Settings** (el engranaje abajo) — las claves y la configuración.

---

## 3. Las claves: qué es cada una y cuál NUNCA se comparte

Ve a **Project Settings → API Keys** y **Project Settings → Data API**.

| Clave | Dónde vive | Qué pasa si se filtra |
|---|---|---|
| **Project URL** | App móvil y backend | Nada. Es pública. |
| **anon / public key** | App móvil y backend | Nada grave. Es pública **por diseño**: con ella solo se puede hacer lo que permitan las policies RLS. Por eso la RLS no es opcional. |
| **service_role key** | **Solo** `api/.env` | 🔴 **Desastre.** Ignora toda la RLS: quien la tenga lee y borra los datos de todos los usuarios. Nunca va en la app móvil, nunca en Git, nunca en el frontend. |
| **JWT Secret** (Settings → API → JWT Settings) | **Solo** `api/.env` | 🔴 **Desastre.** Permite fabricar tokens válidos y hacerse pasar por cualquier usuario. |

**La regla de oro**: si una clave acaba dentro del bundle de la app móvil,
considérala pública — cualquiera puede extraerla del `.apk` o del `.ipa`. Solo
`Project URL` y `anon key` pueden estar ahí.

Ahora:

```bash
cp api/.env.example api/.env
```

Y rellena `api/.env` con los cuatro valores. `api/.env` ya está en `.gitignore`.

---

## 4. Aplicar las migraciones

Las migraciones son los archivos de `supabase/migrations/`: SQL numerado por
fecha que construye la base de datos paso a paso. Se aplican **en orden** y cada
una se ejecuta **una sola vez**. Así cualquiera puede reconstruir la base de
datos idéntica desde cero.

Hay dos caminos. **Si nunca has usado una terminal con herramientas de este
tipo, usa la opción B**: es igual de válida y no instala nada.

### Opción A — con la CLI de Supabase (recomendada a medio plazo)

```bash
npx supabase login
```

Se abre el navegador, autorizas, vuelves a la terminal.

Luego enlaza el repo con tu proyecto. El `project-ref` es el código que aparece
en la URL del dashboard (`https://supabase.com/dashboard/project/`**`abcdefgh...`**)
y también en Project Settings → General.

```bash
npx supabase link --project-ref TU_PROJECT_REF
```

Te pedirá la contraseña de la base de datos del paso 1.

```bash
npx supabase db push
```

Te listará las 5 migraciones pendientes y pedirá confirmación. Dile que sí.

> No necesitas Docker para esto. Docker solo hace falta si más adelante quieres
> levantar una copia local completa de Supabase (`supabase start`), que no es
> necesario para el MVP.

### Opción B — copiar y pegar en el SQL Editor

Ve a **SQL Editor → New query** y ejecuta el contenido de cada archivo
**en este orden exacto**, uno por uno (pegar → Run → comprobar que dice
*Success*):

1. `supabase/migrations/20260930120000_core_functions.sql`
2. `supabase/migrations/20260930120100_profiles.sql`
3. `supabase/migrations/20260930120200_brands.sql`
4. `supabase/migrations/20260930120300_cars.sql`
5. `supabase/migrations/20260930120400_storage_car_images.sql`

El orden importa: `profiles` usa una función que crea la primera, y `cars`
apunta a `brands`.

---

## 5. Comprobar que funcionó

**Table Editor** → deberías ver `profiles`, `brands` y `cars`.

Abre `brands`: tiene que haber **32 filas** (Hot Wheels, Matchbox, Maisto…).

Fíjate en que al lado del nombre de cada tabla aparece el candado de **RLS
enabled**. Si alguna dijera *RLS disabled*, esa tabla estaría expuesta: avísame.

---

## 6. Probar el aislamiento entre usuarios

Esta es la parte que de verdad importa.

1. **Authentication → Users → Add user → Create new user**
   - Email `test-a@wheelvault.test`, cualquier contraseña, marca
     **Auto Confirm User**.
   - Repite con `test-b@wheelvault.test`.
2. Copia el **UID** de cada uno (la columna de la izquierda, un UUID largo).
3. Abre `supabase/tests/rls_isolation.sql`, pega los dos UUID en las líneas
   `user_a :=` y `user_b :=`.
4. **SQL Editor → New query**, pega el archivo completo, **Run**.

Resultado esperado: `Success. No rows returned`, y en la pestaña de mensajes
(*Messages* / *Logs*, junto a *Results*):

```
  OK  1/7  A no puede crear autos en la cuenta de B
  ...
 TODAS LAS PRUEBAS DE AISLAMIENTO PASARON (7/7)
```

Si sale un `FALLO DE SEGURIDAD: ...`, **páramelo y pásamelo**. Significa que una
policy está mal y no tiene sentido construir nada encima.

**De paso acabas de comprobar otra cosa**: al crear esos dos usuarios, el
trigger `handle_new_user` les creó automáticamente su fila en `profiles`.
Compruébalo en Table Editor → `profiles`: deberían estar los dos, con
`display_name` = `test-a` y `test-b`.

---

## 7. Si la migración de Storage falló

La migración `20260930120400_storage_car_images.sql` toca una tabla del sistema
(`storage.objects`) y, según la versión del proyecto, puede dar:

```
ERROR: must be owner of table objects
```

No es grave y no bloquea nada del MVP (las fotos son la fase 5.5). Solución:
pega ese mismo archivo en el **SQL Editor** del dashboard, que se ejecuta con
más privilegios. Si aun así falla, se crea el bucket a mano desde
**Storage → New bucket** (nombre `car-images`, **Public bucket: OFF**) y las
policies desde **Storage → Policies**; lo vemos cuando lleguemos a esa fase.

---

## 8. Configurar Auth

**Authentication → Sign In / Providers → Email**:

- **Confirm email**: **ON**. Obliga a verificar el correo antes de entrar.
- **Minimum password length**: **8** (coincide con `PASSWORD_LIMITS` en
  `shared/src/limits.ts`).
- **Email** debe estar habilitado; Google, Apple y Facebook los dejamos
  apagados (decisión del MVP).

**Authentication → URL Configuration**: esto decide a dónde va el usuario al
pulsar un enlace de correo. **Sin tocarlo, los enlaces llevan a
`http://localhost:3000`**, que es el valor por defecto de Supabase y no existe
en un teléfono.

| Campo | Valor |
|---|---|
| **Site URL** | `wheelvault://` |
| **Redirect URLs** | `wheelvault://**` |

Las dos cosas, y cada una por su motivo:

- **Redirect URLs** es una lista blanca. La app pide volver a
  `wheelvault://reset-password` (recuperar contraseña) y a `wheelvault://`
  (confirmar correo). Si esas direcciones no están en la lista, Supabase
  **descarta la petición sin avisar** y usa el Site URL. Es un fallo silencioso:
  el correo llega, el enlace funciona, y acaba en una página que no existe. El
  comodín `**` cubre cualquier ruta, así que no hay que volver aquí al añadir
  pantallas nuevas.

- **Site URL** es el destino de reserva. Dejarlo en `localhost:3000` significa
  que cualquier caso que se escape de la lista blanca sigue cayendo en una URL
  muerta.

Las direcciones salen de `mobile/src/features/auth/deepLinks.ts`, y el esquema
`wheelvault` de `scheme` en `mobile/app.json`.

> **Si pruebas con el servidor de desarrollo** en vez de con una build nativa,
> ahí la dirección no es `wheelvault://` sino `exp://TU_IP:8081/--/...`. Añade
> también `exp://**` a *Redirect URLs* mientras desarrolles, o prueba el flujo
> directamente sobre la app compilada, que es lo que verá el usuario.

> **Un enlace abierto desde el ordenador no va a funcionar.** `wheelvault://`
> solo lo entiende un dispositivo con la app instalada. Para que el correo
> funcione también desde un navegador de escritorio hace falta un dominio real
> con App Links (Android) y Universal Links (iOS), que es bastante más trabajo.
> Para el MVP basta con abrir el correo desde el móvil.

> El plan Free usa un servidor de correo compartido con un límite bajo de envíos
> por hora, pensado solo para pruebas. Antes de producción hay que conectar un
> proveedor SMTP propio (Resend, SendGrid, Postmark). Lo anoto para la fase 10.

---

## 9. Generar los tipos de TypeScript

Supabase puede leer tu esquema y escribir un archivo `.ts` con los tipos exactos
de cada tabla. A partir de ahí, si escribes `car.modelo` en vez de `car.model`,
TypeScript te lo marca en rojo antes de ejecutar nada.

```bash
npm run db:types
```

Genera `api/src/types/database.types.ts`. **Este comando hay que volver a
correrlo cada vez que cambiemos una migración.**

Requiere haber hecho `supabase link` (opción A del paso 4). No hace falta
instalar la CLI globalmente: el script la invoca con `npx`.

Para una instancia local (`supabase start`):

```bash
npm run db:types -- --local
```

> **Por qué es un script de Node y no una redirección del shell.** Lo natural
> sería `supabase gen types ... > archivo.ts`, pero el operador `>` **vacía el
> archivo antes** de ejecutar el comando. Si el comando falla —la CLI no está,
> el proyecto no está enlazado, no hay red— te quedas sin el archivo anterior y
> el proyecto deja de compilar. `scripts/gen-types.mjs` captura la salida en
> memoria y solo escribe si el comando terminó bien y lo que devolvió parece de
> verdad un archivo de tipos.

---

## Resumen de reglas que no se rompen

1. `service_role key` y `JWT secret` **jamás** salen de `api/.env`.
2. Ningún `.env` se sube a Git. Solo `.env.example`, sin valores.
3. Ninguna tabla nueva se crea sin su RLS y sus policies **en la misma
   migración**.
4. Nunca se edita el esquema a mano desde el dashboard: todo cambio es una
   migración nueva en `supabase/migrations/`, para que dev y producción no se
   desincronicen.
5. Después de cambiar el esquema: `npm run db:types`.
