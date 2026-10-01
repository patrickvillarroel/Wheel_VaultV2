-- ---------------------------------------------------------------------------
-- 20260930120400_storage_car_images
-- Bucket privado para las fotos de los autos (se consume en la FASE 5.5).
--
-- Convencion de rutas:  <user_id>/<car_id>.<ext>
-- La primera carpeta ES el user_id, y de ahi sale el control de acceso:
-- storage.foldername(name)[1] = auth.uid().
--
-- El bucket es privado: la app nunca expone una URL permanente, pide una URL
-- firmada de corta duracion cuando necesita mostrar la imagen.
--
-- NOTA: si esta migracion falla con "must be owner of table objects", aplica
-- este bloque desde el SQL Editor del dashboard de Supabase (ahi se ejecuta con
-- privilegios suficientes). Ver docs/supabase-setup.md, paso 7.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'car-images',
  'car-images',
  false,
  5242880, -- 5 MB, igual que IMAGE_LIMITS.maxBytes en shared/src/limits.ts
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "car_images_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'car-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "car_images_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'car-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "car_images_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'car-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'car-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "car_images_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'car-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
