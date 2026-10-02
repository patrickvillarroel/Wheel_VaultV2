import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FavoriteButton } from '../../../components/ui/FavoriteButton';
import { colors, radii, spacing, typography, TOUCH_TARGET } from '../../../theme';
import type { Car } from '../api';
import { CarImage } from './CarImage';

/**
 * Tarjeta del inventario: foto a la izquierda y la ficha a la derecha.
 *
 * Es el formato del diseño para la lista, distinto del cuadrado que usan los
 * carruseles. Aquí hay sitio para el año, el fabricante y la cantidad, que es
 * lo que se consulta de un vistazo al repasar la colección; en una cuadrícula
 * de dos columnas no caben.
 */
export const CarRow = memo(function CarRow({
  car,
  onPress,
  onToggleFavorite,
}: {
  car: Car;
  onPress: () => void;
  onToggleFavorite: () => void;
}) {
  const specs = [
    { icon: 'calendar-outline' as const, label: 'Año', value: car.year ? String(car.year) : '—' },
    {
      icon: 'pricetag-outline' as const,
      label: 'Fabricante',
      value: car.brand?.name ?? '—',
    },
    { icon: 'cube-outline' as const, label: 'Cantidad', value: String(car.quantity) },
  ];

  return (
    // La estrella va fuera del área pulsable principal: dos Pressable anidados
    // dejan en duda si el toque abre el detalle o marca el favorito.
    <View style={styles.card}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${car.model}, ${car.brand?.name ?? 'sin fabricante'}`}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
      >
        <CarImage path={car.image_path} style={styles.image} iconSize={28} />

        <View style={styles.body}>
          {/* Hueco a la derecha para la estrella, que va superpuesta. */}
          <Text style={styles.model} numberOfLines={2}>
            {car.model}
          </Text>

          <View style={styles.rule} />

          <View style={styles.specs}>
            {specs.map((spec) => (
              <View key={spec.label} style={styles.spec}>
                <Ionicons name={spec.icon} size={14} color={colors.textMuted} />
                <Text style={styles.specLabel}>{spec.label}:</Text>
                <Text style={styles.specValue} numberOfLines={1}>
                  {spec.value}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </Pressable>

      <View style={styles.favorite}>
        <FavoriteButton
          isFavorite={car.is_favorite}
          onToggle={onToggleFavorite}
          label={car.model}
          size={24}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  main: {
    flexDirection: 'row',
  },
  pressed: {
    opacity: 0.75,
  },
  image: {
    width: 120,
    /**
     * Se estira al alto de la tarjeta en lugar de fijar una proporción.
     *
     * Las fotos de una colección vienen en las dos orientaciones: los blísters
     * son verticales y un modelo suelto se fotografía apaisado. Con una
     * proporción fija, una de las dos deja franjas vacías o se recorta de más;
     * estirándola, la imagen siempre llena su lado de la tarjeta.
     */
    alignSelf: 'stretch',
  },
  body: {
    flex: 1,
    padding: spacing.lg,
    // Deja sitio a la estrella superpuesta arriba a la derecha.
    paddingRight: TOUCH_TARGET,
    gap: spacing.sm,
  },
  model: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  rule: {
    height: 2,
    borderRadius: radii.full,
    backgroundColor: colors.red,
    // No ocupa todo el ancho: en el diseño es un subrayado del título, no un
    // separador de la tarjeta.
    width: '70%',
  },
  specs: {
    gap: spacing.xs,
  },
  spec: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  specLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  specValue: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
    flexShrink: 1,
  },
  favorite: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
});
