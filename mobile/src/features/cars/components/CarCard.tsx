import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography, TOUCH_TARGET } from '../../../theme';
import type { Car } from '../api';
import { CarImage } from './CarImage';

/** Dos líneas de título, para que "Porsche 911 GT3" no se corte en "Porsche 911…". */
const TITLE_HEIGHT = typography.bodyStrong.lineHeight * 2;

/**
 * Tarjeta de un auto en la lista, siguiendo el diseño: foto arriba, modelo,
 * fabricante y el corazón de favorito.
 *
 * Va memorizada porque la lista puede tener cientos de elementos y marcar un
 * favorito cambia el estado de uno solo; sin `memo` se repintarían todos.
 */
export const CarCard = memo(function CarCard({
  car,
  onPress,
  onToggleFavorite,
}: {
  car: Car;
  onPress: () => void;
  onToggleFavorite: () => void;
}) {
  const subtitle = car.brand?.name ?? 'Sin fabricante';

  return (
    // El corazón es hermano del área pulsable, no hijo: dos Pressable anidados
    // generan HTML inválido en web y en nativo dejan en duda si el toque abre
    // el detalle o marca el favorito.
    <View style={styles.card}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${car.model}, ${subtitle}`}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
      >
        <CarImage path={car.image_path} style={styles.image} />

        <View style={styles.body}>
          <Text style={styles.model} numberOfLines={2}>
            {car.model}
          </Text>
          <Text style={styles.brand} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </Pressable>

      <Pressable
        onPress={onToggleFavorite}
        hitSlop={spacing.sm}
        accessibilityRole="button"
        accessibilityLabel={
          car.is_favorite ? `Quitar ${car.model} de favoritos` : `Marcar ${car.model} como favorito`
        }
        accessibilityState={{ selected: car.is_favorite }}
        style={({ pressed }) => [styles.favorite, pressed && styles.pressed]}
      >
        <Ionicons
          name={car.is_favorite ? 'heart' : 'heart-outline'}
          size={22}
          color={car.is_favorite ? colors.red : colors.textMuted}
        />
      </Pressable>

      {/* La cantidad solo se muestra cuando hay más de uno: un "1" en cada
          tarjeta es ruido que no aporta nada. */}
      {car.quantity > 1 ? (
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText}>×{car.quantity}</Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  main: {
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  body: {
    padding: spacing.md,
    // Deja sitio al corazón, que va superpuesto a la derecha.
    paddingRight: TOUCH_TARGET,
    gap: 2,
  },
  model: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
    // Altura fija de dos líneas para que todas las tarjetas de una fila midan
    // lo mismo, tenga el modelo un nombre largo o corto.
    minHeight: TITLE_HEIGHT,
  },
  brand: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  favorite: {
    position: 'absolute',
    right: spacing.xs,
    bottom: spacing.xs,
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: colors.overlay,
  },
  badgeText: {
    ...typography.label,
    color: colors.textPrimary,
  },
});
