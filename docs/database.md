# Base de datos

PostgreSQL gestionado por Supabase. Todo el esquema vive en
`supabase/migrations/`, en orden cronológico. **Nunca** se edita el esquema a
mano desde el dashboard.

## Modelo

```
auth.users  (Supabase Auth: email, contraseña cifrada, confirmación…)
    │ 1:1                                    │ 1:N
    ▼                                        ▼
profiles                                  brands  (solo las privadas)
                                             │ 1:N
auth.users ──1:N──► cars ──────N:1──────────┘
```

| Relación | Regla de borrado | Porqué |
|---|---|---|
| `auth.users` → `profiles` | CASCADE | El usuario se lleva su perfil |
| `auth.users` → `cars` | CASCADE | El usuario se lleva su colección |
| `auth.users` → `brands` | CASCADE | Solo afecta a sus marcas privadas |
| `brands` → `cars` | **RESTRICT** | No se borra una marca que tiene autos |

## Tablas

### `profiles`

1:1 con `auth.users`. **No duplica el email ni la contraseña**: eso vive solo en
`auth.users`.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | FK a `auth.users`, CASCADE |
| `display_name` | text NOT NULL | CHECK 1..50 |
| `avatar_path` | text | Preparado; ruta en Storage, no URL |
| `bio` | text | CHECK ≤ 500; preparado |
| `created_at` / `updated_at` | timestamptz | |

Se crea sola: el trigger `on_auth_user_created` sobre `auth.users` llama a
`handle_new_user()`.

> El CHECK admite desde 1 carácter aunque Zod exija 2. Si esa función lanzara
> una excepción, **el registro del usuario fallaría por completo**; las reglas
> estrictas se aplican donde fallar es barato.

### `brands`

Fabricantes del modelo a escala. Modelo híbrido (ADR-003):

- `created_by IS NULL` → marca del **catálogo global**, visible para todos,
  modificable solo por migración.
- `created_by = <uuid>` → marca **privada** de ese usuario.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `name` | text NOT NULL | CHECK 1..60 |
| `slug` | text NOT NULL | CHECK formato `kebab-case`; para assets y URLs |
| `description` | text | CHECK ≤ 1000 |
| `logo_url` | text | CHECK ≤ 500 |
| `created_by` | uuid | NULL = global |
| `created_at` / `updated_at` | timestamptz | |

Unicidad **case-insensitive** y separada por ámbito, con índices parciales:

```sql
brands_global_name_key  → unique (lower(name)) where created_by is null
brands_user_name_key    → unique (created_by, lower(name)) where created_by is not null
brands_global_slug_key  → unique (slug) where created_by is null
```

Así "Hot Wheels" global no choca con una marca privada homónima, y nadie puede
crear "hot wheels" como duplicado del catálogo.

El catálogo (32 marcas) se inserta **en la migración**, no en `seed.sql`: en
producción es un dato obligatorio (sin marcas no se puede crear un auto) y
`seed.sql` solo corre en `supabase db reset` local. El `INSERT` va **antes** de
activar la RLS, porque la policy de INSERT exige `created_by = auth.uid()` y
durante una migración no hay sesión de usuario.

### `cars`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid NOT NULL | FK `auth.users`, CASCADE |
| `brand_id` | uuid NOT NULL | FK `brands`, **RESTRICT** |
| `vehicle_make` | text | CHECK ≤ 60 — "Porsche" |
| `model` | text NOT NULL | CHECK 1..100 — "911 GT3" |
| `year` | smallint | CHECK 1900..2100 |
| `description` | text | CHECK ≤ 1000 |
| `quantity` | integer NOT NULL DEFAULT 1 | CHECK 1..9999 |
| `is_favorite` | boolean NOT NULL DEFAULT false | |
| `image_path` | text | `<user_id>/<car_id>.<ext>` en el bucket `car-images` |
| `created_at` / `updated_at` | timestamptz | |

**Por qué el año llega a 2100**: un CHECK en PostgreSQL debe ser *inmutable*, y
`extract(year from now())` no lo es — Postgres rechaza la tabla. El límite real
(año actual + 2) se aplica en Zod. Ver `shared/src/limits.ts`.

**No existe una columna `marca` de texto.** Duplicar el nombre de la marca junto
a `brand_id` permitiría que ambos valores se desincronizaran (ADR-004).

Índices:

| Índice | Para qué |
|---|---|
| `(user_id, created_at desc, id desc)` | Listado paginado por keyset; el orden del índice coincide con el `ORDER BY`, así que no hay sort |
| `(user_id, brand_id)` | "Mis autos de esta marca" y el conteo de la pantalla de Marcas |
| `(brand_id)` | Que el `ON DELETE RESTRICT` no escanee la tabla entera |
| `(user_id) where is_favorite` | Parcial: solo indexa las filas favoritas |

**Planeado, aún no creado**: índice trigram sobre `model` (`gin_trgm_ops`) para
la búsqueda. Se añade con la feature de búsqueda, no antes: un índice GIN sin
uso solo encarece las escrituras.

## Row Level Security

Las tres tablas tienen `ENABLE ROW LEVEL SECURITY`.

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | `id = auth.uid()` | — (trigger) | `id = auth.uid()` (USING + WITH CHECK) | — (cascade) |
| `brands` | `created_by IS NULL OR created_by = auth.uid()` | `created_by = auth.uid()` | `created_by = auth.uid()` | `created_by = auth.uid()` |
| `cars` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` (USING + WITH CHECK) | `user_id = auth.uid()` |

Todas se declaran `TO authenticated`, y además se hace
`REVOKE ALL ... FROM anon`: el rol anónimo no tiene acceso a ninguna de las tres.

Dos detalles que no son cosméticos:

- **`(select auth.uid())` en vez de `auth.uid()`**: Postgres lo evalúa una sola
  vez por consulta (InitPlan) en lugar de una vez por fila.
- **`WITH CHECK` además de `USING` en los UPDATE**: `USING` decide qué filas
  puedes tocar; `WITH CHECK` decide cómo pueden quedar. Sin él, un usuario
  podría tomar un auto suyo y reasignarlo a otro `user_id`.

### Por qué no usamos `FORCE ROW LEVEL SECURITY`

El diseño inicial lo contemplaba. No se aplicó, por dos razones concretas:

1. `handle_new_user()` es `SECURITY DEFINER` e inserta en `profiles` cuando
   todavía no hay sesión (`auth.uid()` es `NULL`). Con FORCE, el dueño de la
   función también queda sujeto a las policies y **ningún registro de usuario
   funcionaría**.
2. El catálogo de marcas se inserta desde migraciones, donde tampoco hay sesión.

FORCE solo quita la exención del *dueño* de la tabla, y ningún componente de la
app se conecta como dueño: Express entra como `authenticated` (ADR-002) y los
scripts administrativos con `service_role`, que tiene el atributo `BYPASSRLS` y
no se ve afectado por FORCE de todos modos. El beneficio era nulo y el riesgo de
romper el registro, real.

## Storage

Bucket **privado** `car-images`, 5 MB por archivo, solo `jpeg`/`png`/`webp`.

Convención de rutas: `<user_id>/<car_id>.<ext>`. La primera carpeta es el
`user_id`, y de ahí sale el control de acceso:

```sql
(storage.foldername(name))[1] = (select auth.uid())::text
```

Al ser privado, la app nunca expone una URL permanente: pide una **URL firmada**
de corta duración cuando necesita mostrar la imagen.

## Pruebas

`supabase/tests/rls_isolation.sql` comprueba, hablando directo con Postgres y
sin pasar por el backend, que un usuario no puede leer, modificar, borrar ni
inyectar datos en la cuenta de otro (7 pruebas). Instrucciones de ejecución en
[supabase-setup.md](supabase-setup.md), paso 6.

Hay que volver a correrlo **cada vez que se toque una policy**.

## Al cambiar el esquema

1. Nueva migración en `supabase/migrations/` (nunca editar una ya aplicada).
2. RLS y policies **en la misma migración** que crea la tabla.
3. `supabase db push`.
4. `npm run db:types`.
5. Volver a correr `rls_isolation.sql`.
