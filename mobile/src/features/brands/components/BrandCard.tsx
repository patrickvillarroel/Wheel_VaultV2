import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../../theme';
import type { Brand } from '../api';

/**
 * Tarjeta cuadrada de marca, como el carrusel del diseño.
 *
 * El catálogo todavía no tiene logotipos (`logo_url` está vacío), así que de
 * momento se muestra el nombre. Cuando lleguen, la imagen sustituye al texto
 * sin tocar nada más.
 */
export function BrandCard({ brand, onPress }: { brand: Brand; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        brand.car_count > 0 ? `${brand.name}, ${brand.car_count} en tu colección` : brand.name
      }
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {brand.logo_url ? (
        <Image source={{ uri: brand.logo_url }} style={styles.logo} contentFit="contain" />
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
    width: 104,
    height: 104,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  pressed: {
    opacity: 0.75,
  },
  logo: {
    width: '80%',
    height: '60%',
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
