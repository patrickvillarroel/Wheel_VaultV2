import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../../theme';
import type { Brand } from '../api';
import { getBrandLogo } from '../logos';

/**
 * Tarjeta cuadrada de marca, como el carrusel del diseño.
 *
 * Si la marca no tiene logotipo —ni en la app ni en `logo_url`— se muestra su
 * nombre. Eso mantiene el catálogo usable mientras se completan las imágenes,
 * en lugar de dejar tarjetas en blanco.
 */
export function BrandCard({
  brand,
  onPress,
  fill = false,
}: {
  brand: Brand;
  onPress: () => void;
  /**
   * Ocupa el ancho que le dé su contenedor en lugar de medir 112 px.
   *
   * Lo usa la cuadrícula del catálogo: con un ancho fijo, tres columnas no
   * caben en una pantalla de 320 pt y la tercera se sale.
   */
  fill?: boolean;
}) {
  const logo = getBrandLogo(brand.slug, brand.logo_url);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        brand.car_count > 0 ? `${brand.name}, ${brand.car_count} en tu colección` : brand.name
      }
      style={({ pressed }) => [
        styles.card,
        fill ? styles.cardFill : styles.cardFixed,
        pressed && styles.pressed,
      ]}
    >
      {logo ? (
        <Image
          source={logo}
          style={styles.logo}
          contentFit="contain"
          // El nombre ya está en la etiqueta accesible del botón.
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      ) : (
        <Text style={styles.name} numberOfLines={3}>
          {brand.name}
        </Text>
      )}

      {brand.car_count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{brand.car_count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    // Margen pequeño: los logotipos son anchos (del orden de 2,5:1) y con
    // `contain` el ancho es lo que manda. Cada píxel de relleno se los come.
    padding: spacing.xs,
  },
  cardFixed: {
    width: 112,
    height: 112,
  },
  cardFill: {
    flex: 1,
    aspectRatio: 1,
  },
  pressed: {
    opacity: 0.75,
  },
  logo: {
    // Ocupa toda la caja: `contain` se encarga de respetar la proporción, así
    // que un logotipo ancho se escala hasta tocar los lados y uno cuadrado
    // hasta tocar arriba y abajo.
    width: '100%',
    height: '100%',
  },
  name: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    minWidth: 22,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: radii.full,
    backgroundColor: colors.redSoft,
    borderWidth: 1,
    borderColor: colors.red,
  },
  badgeText: {
    ...typography.label,
    color: colors.red,
    textAlign: 'center',
  },
});
