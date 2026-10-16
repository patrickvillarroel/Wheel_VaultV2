import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, View, type DimensionValue } from 'react-native';
import { colors } from '../../../theme';
import { useCarImageUrl } from '../useCarImage';

/**
 * Solo las propiedades de tamaño y forma, que es lo único que las pantallas
 * necesitan ajustar.
 *
 * Aceptar un `StyleProp` genérico no compila: `ViewStyle` e `ImageStyle` no son
 * compatibles —difieren, entre otras cosas, en `overflow`— y el componente
 * pinta a veces una imagen y a veces una vista. Acotarlo deja claro qué admite.
 */
interface CarImageStyle {
  width?: DimensionValue;
  height?: DimensionValue;
  aspectRatio?: number;
  borderRadius?: number;
  alignSelf?: 'stretch' | 'center' | 'flex-start' | 'flex-end';
}

/**
 * La foto de un auto, o su marcador si no tiene.
 *
 * El bucket es privado, así que la URL se firma al vuelo. Mientras llega —y si
 * no llega nunca— se muestra el marcador: una tarjeta sin imagen se ve
 * intencionada, un hueco en blanco parece un fallo.
 */
export function CarImage({
  path,
  style,
  iconSize = 32,
  contentFit = 'cover',
}: {
  path: string | null;
  style?: CarImageStyle;
  iconSize?: number;
  /**
   * `cover` para las tarjetas de las listas, donde lo que importa es que no
   * queden huecos. `contain` para el detalle: ahí la foto es el contenido y
   * recortar un blister por los lados se come la mitad del cartón.
   */
  contentFit?: 'cover' | 'contain';
}) {
  const { data: url } = useCarImageUrl(path);

  if (!url) {
    return (
      <View style={[styles.placeholder, style]}>
        <Ionicons name="car-sport" size={iconSize} color={colors.textMuted} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: url }}
      // El fondo opaco solo con `cover`: con `contain` la foto no llena la
      // caja, y pintarlo taparía lo que haya detrás —que es justo el recurso
      // que usa el detalle para rellenar los lados.
      style={[contentFit === 'cover' && styles.image, style]}
      contentFit={contentFit}
      transition={200}
      // Se cachea en disco: al volver a la lista la foto ya está, aunque la URL
      // firmada sea nueva.
      cachePolicy="memory-disk"
    />
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.surfaceAlt,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
});
