import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { supabase } from './supabase';

/**
 * Fotos de los autos en Supabase Storage.
 *
 * Esta es la única parte de la app que habla con Supabase para algo que no es
 * identidad, y es deliberado: subir binarios a través de Express significaría
 * mover la imagen dos veces por la red y gastar memoria del servidor sin
 * ganar nada. Las policies del bucket ya imponen el mismo aislamiento que la
 * RLS de las tablas —cada usuario solo escribe dentro de su carpeta— así que
 * el control de acceso no se debilita. Ver ADR-007.
 *
 * El bucket es privado: no existe una URL permanente. Para mostrar una imagen
 * se pide una URL firmada de corta duración.
 */

const BUCKET = 'car-images';

/** Los móviles hacen fotos de 12 MP; a 1200 px se ve igual y pesa 40 veces menos. */
const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.8;

/** Coincide con `IMAGE_LIMITS` en shared y con el límite del bucket. */
const MAX_BYTES = 5 * 1024 * 1024;

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * La primera carpeta de la ruta es el `user_id`, y de ahí sale el permiso:
 * la policy del bucket comprueba `storage.foldername(name)[1] = auth.uid()`.
 */
function buildPath(userId: string, carId: string): string {
  return `${userId}/${carId}.jpg`;
}

/**
 * Reduce la imagen antes de subirla.
 *
 * Se hace en el dispositivo, no en el servidor: ahorra batería del usuario y
 * datos móviles, y evita subir 8 MB para mostrarlos en una tarjeta de 150 px.
 */
async function compress(localUri: string): Promise<string> {
  const context = ImageManipulator.manipulate(localUri);
  context.resize({ width: MAX_DIMENSION });

  const image = await context.renderAsync();
  const result = await image.saveAsync({
    compress: JPEG_QUALITY,
    format: SaveFormat.JPEG,
  });

  return result.uri;
}

/**
 * Sube la foto de un auto y devuelve la ruta que hay que guardar en
 * `cars.image_path`.
 *
 * `upsert` está activado a propósito: cada auto tiene como mucho una imagen y
 * la ruta es determinista, así que cambiar la foto sobrescribe la anterior en
 * vez de dejar archivos huérfanos ocupando espacio.
 */
export async function uploadCarImage(
  userId: string,
  carId: string,
  localUri: string,
): Promise<string> {
  const compressedUri = await compress(localUri);
  const file = new File(compressedUri);

  if (file.size !== null && file.size > MAX_BYTES) {
    throw new StorageError('La imagen es demasiado grande. Prueba con otra foto.');
  }

  const bytes = await file.arrayBuffer();
  const path = buildPath(userId, carId);

  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: 'image/jpeg',
    upsert: true,
  });

  if (error) {
    throw new StorageError('No se pudo subir la imagen. Inténtalo de nuevo.');
  }

  return path;
}

/**
 * URL temporal para mostrar una imagen del bucket privado.
 *
 * Devuelve `null` en vez de lanzar: que falte la foto de un auto no debe
 * impedir que la pantalla se pinte. La tarjeta cae a su marcador.
 */
export async function getSignedUrl(path: string, expiresInSeconds = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data) return null;

  return data.signedUrl;
}

/**
 * Firma varias rutas en una sola peticion.
 *
 * Existe porque una lista de mil autos son mil fotos, y firmarlas de una en
 * una es una ida y vuelta a Supabase por tarjeta. Con una colección pequeña no
 * se nota; desplazando un inventario grande es la diferencia entre una peticion
 * y cientos.
 *
 * Devuelve un mapa y no un array para que quien llama no dependa de que el
 * orden de la respuesta coincida con el de la petición. Una ruta que falle sale
 * como `null`, igual que en `getSignedUrl`: la tarjeta cae a su marcador.
 */
export async function getSignedUrls(
  paths: string[],
  expiresInSeconds = 3600,
): Promise<Map<string, string | null>> {
  const urls = new Map<string, string | null>();

  if (paths.length === 0) return urls;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, expiresInSeconds);

  // Un fallo global deja todas en null en vez de lanzar: que no haya fotos es
  // degradarse, no romperse.
  if (error || !data) {
    for (const path of paths) urls.set(path, null);
    return urls;
  }

  for (const entry of data) {
    if (entry.path) urls.set(entry.path, entry.error ? null : entry.signedUrl);
  }

  // Si Supabase omite alguna ruta, quien espera su promesa tiene que recibir
  // algo igualmente o se queda colgado para siempre.
  for (const path of paths) {
    if (!urls.has(path)) urls.set(path, null);
  }

  return urls;
}

/** Al borrar un auto, su foto se va con él. */
export async function deleteCarImage(path: string): Promise<void> {
  // Si falla, se queda un archivo huérfano: molesto, pero no es motivo para
  // impedir que el usuario borre su auto.
  await supabase.storage.from(BUCKET).remove([path]);
}
