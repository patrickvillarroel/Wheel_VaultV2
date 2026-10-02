import { Platform, TurboModuleRegistry } from 'react-native';

/**
 * Escaneo del blister con el escáner de documentos del sistema.
 *
 * Un blister de die-cast es un rectángulo de cartón con bordes marcados sobre
 * una mesa: exactamente el problema que ya resuelven VisionKit en iOS y el
 * Document Scanner de ML Kit en Android. Detectan los bordes, corrigen la
 * perspectiva y devuelven el cartón recortado y derecho, que es lo que la
 * pantalla de detalle espera.
 *
 * Es una opción, no el camino único: muchos carritos están fuera del blister y
 * esos entran por cámara o galería como siempre.
 */

/**
 * Lo que puede pasar al escanear. Se devuelve en vez de lanzar porque cancelar
 * es normal —no un fallo— y quien llama tiene que distinguir los tres casos
 * para decir algo distinto en cada uno.
 */
export type ScanResult =
  | { status: 'scanned'; uri: string }
  | { status: 'cancelled' }
  /** El binario no trae el módulo nativo: Expo Go o la versión web. */
  | { status: 'unavailable' }
  | { status: 'error'; message: string };

/**
 * Nombre con el que el módulo nativo se registra en el binario. Tiene que
 * coincidir con el `getEnforcing('DocumentScanner')` del paquete.
 */
const NATIVE_MODULE = 'DocumentScanner';

/**
 * ¿Trae este binario el escáner?
 *
 * Se pregunta ANTES de importar el paquete, y no es una optimización. El
 * paquete llama a `TurboModuleRegistry.getEnforcing` nada más evaluarse, y en
 * desarrollo Metro envuelve la carga de cada módulo: si lanza, lo reporta él
 * mismo como error fatal —pantalla roja incluida— antes de que un `try/catch`
 * nuestro llegue a verlo, y encima deja el import resuelto en `undefined`.
 *
 * `get` es la versión de `getEnforcing` que devuelve `null` en vez de lanzar.
 * Preguntando primero, en Expo Go o en web el paquete no se carga siquiera.
 */
function isScannerAvailable(): boolean {
  // En web no hay TurboModules; la pregunta ni se plantea.
  if (Platform.OS === 'web') return false;

  return Boolean(TurboModuleRegistry.get(NATIVE_MODULE));
}

export async function scanBlister(): Promise<ScanResult> {
  if (!isScannerAvailable()) {
    return { status: 'unavailable' };
  }

  try {
    // Dinámico para que el paquete no se cargue al abrir el formulario, sino
    // al pulsar "Escanear", y solo cuando ya sabemos que el módulo está.
    const { default: DocumentScanner } = await import('react-native-document-scanner-plugin');

    const { scannedImages } = await DocumentScanner.scanDocument({
      // Un carrito, una foto.
      maxNumDocuments: 1,
      // Sin recomprimir: `uploadCarImage` ya reduce y comprime justo antes de
      // subir, y encadenar dos JPEG degrada la imagen dos veces.
      croppedImageQuality: 100,
    });

    const uri = scannedImages?.[0];

    // Al cancelar, el escáner devuelve la lista vacía. Para nosotros es lo
    // mismo que no haber escaneado nada.
    return uri ? { status: 'scanned', uri } : { status: 'cancelled' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'No se pudo abrir el escáner.',
    };
  }
}
