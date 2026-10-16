-- ---------------------------------------------------------------------------
-- 20260930120000_core_functions
-- Funciones y triggers de uso general.
--
-- Nota de seguridad: todas las funciones fijan `search_path = ''` para evitar
-- el secuestro de search_path (un atacante que cree un objeto en un esquema
-- anterior en la ruta de busqueda podria interceptar la llamada). Por eso
-- cada referencia va calificada con su esquema: public.x, auth.y.
-- ---------------------------------------------------------------------------

-- Mantiene updated_at sincronizado sin depender de que el backend lo envie.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger BEFORE UPDATE: actualiza updated_at a now().';
