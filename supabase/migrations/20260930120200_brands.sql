-- ---------------------------------------------------------------------------
-- 20260930120200_brands
-- Fabricantes del modelo a escala (Hot Wheels, Maisto, Mini GT...).
--
-- OJO: esto NO es la marca del auto real. La marca del vehiculo (Porsche,
-- Nissan) vive en cars.vehicle_make. Ver ADR-004.
--
-- Modelo hibrido (ADR-003):
--   created_by IS NULL      -> marca global del catalogo, visible para todos,
--                              editable solo por migracion.
--   created_by = <user_id>  -> marca privada de ese usuario.
-- ---------------------------------------------------------------------------

create table public.brands (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  slug        text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  description text check (char_length(description) <= 1000),
  logo_url    text check (char_length(logo_url) <= 500),
  created_by  uuid references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.brands is
  'Fabricantes de modelos a escala. created_by NULL = catalogo global (ADR-003).';

-- Unicidad case-insensitive, separada por ambito: "Hot Wheels" global no choca
-- con una marca privada homonima de un usuario.
create unique index brands_global_name_key
  on public.brands (lower(name)) where created_by is null;

create unique index brands_user_name_key
  on public.brands (created_by, lower(name)) where created_by is not null;

create unique index brands_global_slug_key
  on public.brands (slug) where created_by is null;

create index brands_created_by_idx on public.brands (created_by);

create trigger brands_set_updated_at
  before update on public.brands
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Catalogo global inicial.
--
-- Va en una migracion (no en supabase/seed.sql) porque en produccion es un dato
-- obligatorio: sin marcas no se puede crear ningun auto. seed.sql solo corre en
-- `supabase db reset` local.
--
-- Se inserta ANTES de activar RLS: la policy de INSERT exige
-- created_by = auth.uid(), y aqui no hay sesion de usuario.
-- ---------------------------------------------------------------------------
insert into public.brands (name, slug, description) values
  ('Hot Wheels',    'hot-wheels',    'Marca de Mattel creada en 1968. El estandar de facto del 1:64, famosa por sus Treasure Hunt y Super Treasure Hunt.'),
  ('Matchbox',      'matchbox',      'Fundada en 1953 en Reino Unido, hoy parte de Mattel. Enfocada en replicas realistas de vehiculos de calle y de trabajo.'),
  ('Maisto',        'maisto',        'Fabricante con fuerte presencia en 1:18 y 1:24, conocido por licencias de deportivos europeos.'),
  ('Bburago',       'bburago',       'Marca italiana fundada en 1974, especializada en Ferrari, Lamborghini y clasicos a 1:18.'),
  ('Mini GT',       'mini-gt',       'Linea premium 1:64 de TSM Models, muy valorada por su nivel de detalle y tiradas limitadas.'),
  ('Majorette',     'majorette',     'Marca francesa fundada en 1961, popular en Europa por sus series de vehiculos urbanos.'),
  ('Tomica',        'tomica',        'Linea japonesa de Takara Tomy desde 1970, reconocida por su calidad y sus ediciones Tomica Limited Vintage.'),
  ('Greenlight',    'greenlight',    'Fabricante estadounidense especializado en licencias de cine y television a 1:64 y 1:18.'),
  ('Auto World',    'auto-world',    'Marca estadounidense centrada en muscle cars y clasicos americanos.'),
  ('Johnny Lightning', 'johnny-lightning', 'Marca estadounidense de 1:64 nacida en 1969, enfocada en clasicos y muscle cars.'),
  ('M2 Machines',   'm2-machines',   'Fabricante estadounidense de replicas detalladas con chasis y ruedas realistas.'),
  ('Jada Toys',     'jada-toys',     'Conocida por licencias de cine y television, en especial la saga Fast & Furious.'),
  ('Welly',         'welly',         'Fabricante de Hong Kong con amplio catalogo en varias escalas.'),
  ('Kinsmart',      'kinsmart',      'Marca de Hong Kong especializada en modelos 1:36 con puertas y suspension funcionales.'),
  ('Siku',          'siku',          'Marca alemana fundada en 1921, referencia en maquinaria agricola y vehiculos de trabajo.'),
  ('Schuco',        'schuco',        'Fabricante aleman historico, fundado en 1912, con modelos de alta gama.'),
  ('Norev',         'norev',         'Marca francesa fundada en 1946, especializada en vehiculos europeos.'),
  ('Solido',        'solido',        'Fabricante frances fundado en 1932, conocido por sus modelos metalicos de clasicos.'),
  ('Minichamps',    'minichamps',    'Marca alemana de alta gama centrada en replicas de competicion y calle.'),
  ('AUTOart',       'autoart',       'Fabricante de gama alta reconocido por sus modelos compuestos de gran detalle.'),
  ('Kyosho',        'kyosho',        'Marca japonesa con modelos de alta precision en multiples escalas.'),
  ('Tarmac Works',  'tarmac-works',  'Marca de Hong Kong enfocada en vehiculos de competicion y JDM modernos.'),
  ('Inno64',        'inno64',        'Especialista en 1:64 con foco en el automovilismo japones y asiatico.'),
  ('Pop Race',      'pop-race',      'Marca asiatica de 1:64 conocida por sus colaboraciones y liveries personalizadas.'),
  ('Ixo Models',    'ixo-models',    'Fabricante con catalogo extenso de rally, resistencia y vehiculos de servicio.'),
  ('Spark Model',   'spark-model',   'Marca especializada en modelos de resina de competicion.'),
  ('Corgi',         'corgi',         'Marca britanica fundada en 1956, celebre por sus licencias cinematograficas clasicas.'),
  ('Motormax',      'motormax',      'Fabricante con amplio catalogo de vehiculos de calle en varias escalas.'),
  ('Racing Champions', 'racing-champions', 'Marca estadounidense centrada en NASCAR y clasicos americanos.'),
  ('Herpa',         'herpa',         'Marca alemana especializada en modelos a 1:87 y aviacion.'),
  ('Revell',        'revell',        'Fabricante historico de maquetas y modelos armados.'),
  ('Otro',          'otro',          'Marca generica para modelos sin fabricante identificado o no listado.')
on conflict (lower(name)) where created_by is null do nothing;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.brands enable row level security;

-- Todos ven el catalogo global; cada quien ve ademas sus marcas privadas.
create policy "brands_select_global_or_own"
  on public.brands for select to authenticated
  using (created_by is null or created_by = (select auth.uid()));

-- Imposible crear una marca global desde la app: created_by debe ser el usuario.
create policy "brands_insert_own"
  on public.brands for insert to authenticated
  with check (created_by = (select auth.uid()));

-- USING + WITH CHECK: ni se edita una marca ajena ni se reasigna a otro usuario.
create policy "brands_update_own"
  on public.brands for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

create policy "brands_delete_own"
  on public.brands for delete to authenticated
  using (created_by = (select auth.uid()));

revoke all on public.brands from anon;
grant select, insert, update, delete on public.brands to authenticated;
