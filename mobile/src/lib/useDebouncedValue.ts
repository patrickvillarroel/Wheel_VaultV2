import { useEffect, useState } from 'react';

/**
 * Devuelve un valor que solo se actualiza cuando deja de cambiar un rato.
 *
 * Para el buscador de la colección: sin esto, cada tecla cambia la clave de
 * caché de React Query y sale una peticion. Escribir "porsche" eran siete
 * viajes a la API, y cada uno hace dos recorridos de la tabla —el `ilike` del
 * listado y el de los totales— que se tiran a la basura en cuanto llega la
 * siguiente letra.
 *
 * El campo de texto sigue respondiendo al instante: lo que se retrasa es la
 * consulta, no lo que se ve escrito.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);

    // Cada pulsacion cancela el temporizador anterior: por eso solo sobrevive
    // la ultima, y solo cuando hay una pausa de verdad.
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
