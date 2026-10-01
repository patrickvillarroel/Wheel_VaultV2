-- ---------------------------------------------------------------------------
-- 20260930120100_profiles
-- Datos publicos del usuario. Las credenciales viven SOLO en auth.users
-- (gestionada por Supabase Auth); aqui nunca hay email ni contraseña.
-- ADR-001.
-- ---------------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 50),
  avatar_path  text check (char_length(avatar_path) <= 255),
  bio          text check (char_length(bio) <= 500),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is
  'Perfil del usuario. 1:1 con auth.users. El email se lee de auth.users, no se duplica aqui.';
comment on column public.profiles.avatar_path is
  'Preparado para fases posteriores: ruta dentro del bucket de Storage, no una URL.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Alta automatica del perfil al registrarse.
--
-- SECURITY DEFINER: se ejecuta con los permisos del dueño de la funcion porque
-- durante el signup todavia no hay sesion (auth.uid() es null) y ninguna policy
-- de INSERT podria satisfacerse.
--
-- El CHECK de display_name admite desde 1 caracter y aqui truncamos a 50: si
-- esta funcion lanzara una excepcion, el registro del usuario fallaria por
-- completo. Las reglas estrictas (2..50) se aplican en Zod, donde fallar es
-- barato y el mensaje llega al usuario.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        'Coleccionista'
      ),
      50
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- `(select auth.uid())` en vez de `auth.uid()`: Postgres lo evalua una sola vez
-- por consulta (InitPlan) en lugar de una vez por fila.
create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Sin policy de INSERT: el perfil lo crea el trigger.
-- Sin policy de DELETE: se borra en cascada al eliminar la cuenta.

-- Minimo privilegio: el rol anonimo no toca esta tabla.
revoke all on public.profiles from anon;
grant select, update on public.profiles to authenticated;
