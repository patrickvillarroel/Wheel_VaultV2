-- ===========================================================================
-- PRUEBA DE AISLAMIENTO ENTRE USUARIOS (RLS)
--
-- Verifica, hablando directamente con PostgreSQL y SIN pasar por el backend,
-- que un usuario no puede leer, modificar, borrar ni inyectar datos en la
-- cuenta de otro. Si el backend tuviera un bug, esta es la ultima defensa.
--
-- COMO EJECUTARLA
-- ---------------------------------------------------------------------------
-- 1. Crea dos usuarios de prueba en el dashboard de Supabase:
--       Authentication > Users > Add user > Create new user
--       (marca "Auto Confirm User" para no tener que confirmar el correo)
--       Ej.: test-a@wheelvault.test  /  test-b@wheelvault.test
-- 2. Copia el UUID de cada uno (columna UID de la tabla de usuarios).
-- 3. Pegalos abajo en user_a y user_b.
-- 4. Pega TODO este archivo en SQL Editor > New query y pulsa Run.
--
-- RESULTADO ESPERADO
--   Success. No rows returned   + en la pestaña de mensajes:
--   "TODAS LAS PRUEBAS DE AISLAMIENTO PASARON"
--
-- Si algo falla veras un error que empieza con "FALLO DE SEGURIDAD:".
-- En ese caso NO sigas con las siguientes fases: hay una policy mal puesta.
--
-- El bloque es una sola sentencia: si una prueba falla, todo lo que hizo se
-- revierte solo y no queda basura en la base de datos.
-- ===========================================================================

do $$
declare
  -- <<< PEGA AQUI LOS DOS UUID >>>
  user_a  uuid := '00000000-0000-0000-0000-000000000000';
  user_b  uuid := '00000000-0000-0000-0000-000000000000';

  brand_global uuid;
  car_a        uuid;
  affected     integer;
  visible      integer;
  blocked      boolean;
begin
  if user_a = user_b then
    raise exception 'Configura user_a y user_b con los UUID de dos usuarios distintos.';
  end if;

  -- Dejamos de ser postgres: a partir de aqui las policies RLS SI aplican.
  perform set_config('role', 'authenticated', true);

  -- =========================================================================
  -- Contexto: somos el usuario A
  -- =========================================================================
  perform set_config('request.jwt.claims',
    json_build_object('sub', user_a, 'role', 'authenticated')::text, true);

  select id into brand_global from public.brands where slug = 'hot-wheels';
  if brand_global is null then
    raise exception 'No se encontro la marca del catalogo global. ¿Corrio la migracion de brands?';
  end if;

  insert into public.cars (user_id, brand_id, vehicle_make, model, year, quantity)
  values (user_a, brand_global, 'Porsche', 'ZZ Test Aislamiento', 2024, 1)
  returning id into car_a;

  -- -------------------------------------------------------------------------
  -- 1. A no puede crear un auto a nombre de B  (policy INSERT ... WITH CHECK)
  -- -------------------------------------------------------------------------
  blocked := false;
  begin
    insert into public.cars (user_id, brand_id, model)
    values (user_b, brand_global, 'ZZ Test Inyectado');
  exception when insufficient_privilege then
    blocked := true;
  end;
  if not blocked then
    raise exception 'FALLO DE SEGURIDAD: A pudo insertar un auto a nombre de B.';
  end if;
  raise notice '  OK  1/7  A no puede crear autos en la cuenta de B';

  -- -------------------------------------------------------------------------
  -- 2. A no puede regalar su auto a B  (policy UPDATE ... WITH CHECK)
  -- -------------------------------------------------------------------------
  blocked := false;
  begin
    update public.cars set user_id = user_b where id = car_a;
  exception when insufficient_privilege then
    blocked := true;
  end;
  if not blocked then
    raise exception 'FALLO DE SEGURIDAD: A pudo reasignar su auto al usuario B.';
  end if;
  raise notice '  OK  2/7  A no puede reasignar un auto a otro usuario';

  -- -------------------------------------------------------------------------
  -- 3. A no puede modificar una marca del catalogo global
  -- -------------------------------------------------------------------------
  update public.brands set name = 'Hackeada' where id = brand_global;
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'FALLO DE SEGURIDAD: un usuario pudo editar el catalogo global de marcas.';
  end if;
  raise notice '  OK  3/7  El catalogo global de marcas es de solo lectura';

  -- =========================================================================
  -- Contexto: ahora somos el usuario B
  -- =========================================================================
  perform set_config('request.jwt.claims',
    json_build_object('sub', user_b, 'role', 'authenticated')::text, true);

  -- -------------------------------------------------------------------------
  -- 4. B no ve el auto de A  (policy SELECT)
  -- -------------------------------------------------------------------------
  select count(*) into visible from public.cars where id = car_a;
  if visible <> 0 then
    raise exception 'FALLO DE SEGURIDAD: B puede LEER los autos de A.';
  end if;
  raise notice '  OK  4/7  B no puede leer los autos de A';

  -- -------------------------------------------------------------------------
  -- 5. B no puede modificar el auto de A  (policy UPDATE ... USING)
  --    No da error: simplemente no encuentra ninguna fila que pueda tocar.
  -- -------------------------------------------------------------------------
  update public.cars set model = 'Hackeado', quantity = 999 where id = car_a;
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'FALLO DE SEGURIDAD: B pudo MODIFICAR un auto de A.';
  end if;
  raise notice '  OK  5/7  B no puede modificar los autos de A';

  -- -------------------------------------------------------------------------
  -- 6. B no puede borrar el auto de A  (policy DELETE)
  -- -------------------------------------------------------------------------
  delete from public.cars where id = car_a;
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'FALLO DE SEGURIDAD: B pudo BORRAR un auto de A.';
  end if;
  raise notice '  OK  6/7  B no puede borrar los autos de A';

  -- -------------------------------------------------------------------------
  -- 7. B no ve el perfil de A
  -- -------------------------------------------------------------------------
  select count(*) into visible from public.profiles where id = user_a;
  if visible <> 0 then
    raise exception 'FALLO DE SEGURIDAD: B puede leer el perfil de A.';
  end if;
  raise notice '  OK  7/7  B no puede leer el perfil de A';

  -- =========================================================================
  -- Limpieza: volvemos a ser A, el unico que puede borrar su propio auto.
  -- =========================================================================
  perform set_config('request.jwt.claims',
    json_build_object('sub', user_a, 'role', 'authenticated')::text, true);

  delete from public.cars where id = car_a;
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'FALLO: A no pudo borrar su propio auto. Revisa la policy cars_delete_own.';
  end if;

  perform set_config('role', 'postgres', true);

  raise notice '';
  raise notice '===============================================';
  raise notice ' TODAS LAS PRUEBAS DE AISLAMIENTO PASARON (7/7)';
  raise notice '===============================================';
end $$;
