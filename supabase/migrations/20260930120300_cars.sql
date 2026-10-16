-- ---------------------------------------------------------------------------
-- 20260930120300_cars
-- Los modelos a escala de la coleccion. Tabla central de la app.
--
-- Separacion de conceptos (ADR-004):
--   brand_id      -> fabricante del modelo a escala  (Hot Wheels, Maisto)
--   vehicle_make  -> marca del vehiculo real          (Porsche, Nissan)
--   model         -> modelo del vehiculo              (911 GT3, Skyline GT-R)
--
-- No existe una columna `marca` de texto: duplicar el nombre de la marca junto
-- a brand_id permitiria que ambos valores se desincronizaran.
-- ---------------------------------------------------------------------------

create table public.cars (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  brand_id     uuid not null references public.brands (id) on delete restrict,
  vehicle_make text check (char_length(vehicle_make) <= 60),
  model        text not null check (char_length(btrim(model)) between 1 and 100),
  -- El limite superior es una constante porque un CHECK debe ser inmutable:
  -- `extract(year from now())` no lo es y Postgres rechazaria la tabla.
  -- La regla real (año actual + 2) se aplica en Zod. Ver shared/src/limits.ts.
  year         smallint check (year between 1900 and 2100),
  description  text check (char_length(description) <= 1000),
  quantity     integer not null default 1 check (quantity between 1 and 9999),
  is_favorite  boolean not null default false,
  -- Ruta dentro del bucket privado car-images: '<user_id>/<car_id>.<ext>'.
  -- Nunca una URL publica: las URLs se firman al momento de servirlas.
  image_path   text check (char_length(image_path) <= 255),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.cars is
  'Modelos a escala del usuario. Aislamiento por RLS sobre user_id.';
comment on column public.cars.brand_id is
  'Fabricante del modelo a escala (Hot Wheels). ON DELETE RESTRICT: no se borra una marca con autos.';
comment on column public.cars.vehicle_make is
  'Marca del vehiculo real (Porsche). Texto libre en el MVP; normalizable a tabla propia mas adelante.';

-- ---------------------------------------------------------------------------
-- Indices
-- ---------------------------------------------------------------------------

-- Acceso dominante: "mis autos, los mas recientes primero", paginado por
-- keyset. El orden del indice coincide con el ORDER BY (created_at DESC, id DESC)
-- para que Postgres no tenga que ordenar.
create index cars_user_created_idx on public.cars (user_id, created_at desc, id desc);

-- "Mis autos de esta marca" y el conteo por marca de la pantalla de Marcas.
create index cars_user_brand_idx on public.cars (user_id, brand_id);

-- Necesario para que ON DELETE RESTRICT sobre brands no escanee la tabla entera.
create index cars_brand_idx on public.cars (brand_id);

-- Indice parcial: solo indexa las filas marcadas como favoritas.
create index cars_user_favorite_idx on public.cars (user_id) where is_favorite;

create trigger cars_set_updated_at
  before update on public.cars
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — el control de acceso mas importante del proyecto.
--
-- Aunque el backend filtre siempre por user_id, estas policies son la red de
-- seguridad: si un service olvidara el filtro, la base de datos igual devuelve
-- unicamente las filas del usuario autenticado.
-- ---------------------------------------------------------------------------
alter table public.cars enable row level security;

create policy "cars_select_own"
  on public.cars for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "cars_insert_own"
  on public.cars for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- WITH CHECK ademas de USING: sin el, un usuario podria tomar un auto suyo y
-- reasignarlo a otro user_id (regalar o inyectar datos en otra cuenta).
create policy "cars_update_own"
  on public.cars for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "cars_delete_own"
  on public.cars for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.cars from anon;
grant select, insert, update, delete on public.cars to authenticated;
