# ADR-007 — Las fotos se suben directamente a Supabase Storage

**Estado:** aceptada · 2026-10-01

## Contexto

[ADR-002](ADR-002-jwt-propagation.md) establece que los datos van siempre por
Express. Las fotos de los autos son el único caso que no encaja: son binarios de
varios megabytes, no filas.

## Opciones

**A. La imagen pasa por Express** (multipart → Express → Storage)

- ✅ Un solo camino para todo; coherente con ADR-002.
- ❌ El archivo viaja dos veces por la red y ocupa memoria o disco del servidor
  mientras tanto.
- ❌ Obliga a meter manejo de multipart, límites de tamaño y streaming en una
  API que hoy solo mueve JSON.
- ❌ Un plan de hosting pequeño se queda sin memoria con varias subidas a la vez.

**B. La app sube directamente a Storage con su sesión de Supabase**

- ✅ El archivo viaja una sola vez, del móvil al almacenamiento.
- ✅ El control de acceso no se debilita: las policies del bucket imponen el
  mismo aislamiento que la RLS de las tablas, cada usuario solo escribe dentro
  de `<su user_id>/`.
- ✅ Express sigue siendo solo JSON.
- ❌ Es una segunda vía de salida de datos desde la app, que hay que vigilar.
- ❌ La app necesita dos pasos: crear el auto y después subir la foto.

## Decisión

Opción B, con tres condiciones:

1. **El bucket es privado.** No hay URL permanente: para mostrar una imagen se
   pide una URL firmada de una hora.
2. **La ruta la decide el servidor, no el cliente.** La app envía
   `image_path` en el `PATCH`, pero `cars.service` comprueba que sea
   exactamente `<user_id>/<car_id>.jpg` y responde 422 si no lo es. Sin esa
   comprobación un usuario podría dejar su registro apuntando a la carpeta de
   otra persona: no podría leer el archivo —las policies lo impiden— pero la
   base de datos quedaría con referencias cruzadas que no deberían existir.
3. **La imagen se reduce en el dispositivo** antes de subirla (1200 px, JPEG al
   80 %). Un móvil hace fotos de 12 MP y en una tarjeta se muestran a 150 px.

## Consecuencias

- Crear un auto con foto son dos llamadas: `POST /cars` y luego la subida más un
  `PATCH` con la ruta. Si la segunda falla, el auto ya existe y la pantalla lo
  dice en lugar de fingir que todo salió mal.
- La ruta es determinista y la subida usa `upsert`, así que cambiar la foto
  sobrescribe la anterior en vez de dejar archivos huérfanos.
- Las URLs firmadas se cachean casi tanto como duran, para no pedir una nueva en
  cada scroll de la lista.
- Esta es la **única** excepción a ADR-002. Cualquier otro dato nuevo sigue
  pasando por Express.
