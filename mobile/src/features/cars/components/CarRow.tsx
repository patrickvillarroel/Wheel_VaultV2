import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FavoriteButton } from '../../../components/ui/FavoriteButton';
import { FavoriteFrame } from '../../../components/ui/FavoriteFrame';
import { colors, radii, spacing, typography, TOUCH_TARGET } from '../../../theme';
import type { Car } from '../api';
import { CarImage } from './CarImage';

/** Ancho de la columna de la foto. */
const IMAGE_WIDTH = 120;

/**
 * Alto de la tarjeta, el mismo para todas.
 *
 * Sale de sumar lo que ocupa la ficha: 24 de relleno vertical + 24 del título a
 * una línea + 16 de separaciones + 2 del subrayado + 62 de las tres
 * especificaciones. Si cambian esos tokens hay que recalcularlo, y por eso
 * queda escrito aquí y no repartido por los estilos.
 *
 * El título va a una línea y no a dos: reservar la segunda le costaba 24 px a
 * TODAS las tarjetas para que cupieran los pocos nombres largos, y esos se
 * resuelven con puntos suspensivos.
 */
const CARD_HEIGHT = 128;

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
          {/* Hueco a la derecha para el corazón, que va superpuesto. */}
          <Text style={styles.model} numberOfLines={1}>
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

      {/* El último, para que el marco quede por encima de la foto y de la
          ficha en lugar de por debajo. */}
      {car.is_favorite ? <FavoriteFrame /> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    /**
     * Todas las tarjetas miden lo mismo, venga el modelo con un nombre corto o
     * largo y sea la foto vertical o apaisada. Una lista en la que cada fila
     * mide distinto se lee como si estuviera desordenada.
     *
     * Es `minHeight` y no `height` a propósito: con el tamaño de letra grande
     * del sistema la ficha necesita más sitio, y fijar el alto la recortaría
     * contra el `overflow: hidden` de abajo. Así crece en ese caso y en todos
     * los demás —que son casi todos— queda exactamente en CARD_HEIGHT.
     */
    minHeight: CARD_HEIGHT,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  main: {
    flexDirection: 'row',
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
  },
  image: {
    width: IMAGE_WIDTH,
    // Llena su columna entera. Como la tarjeta ya tiene un alto fijo, el hueco
    // de la foto es siempre el mismo: 120 × CARD_HEIGHT.
    alignSelf: 'stretch',
  },
  body: {
    flex: 1,
    // Menos relleno arriba y abajo que a los lados: es de donde se recorta
    // alto sin que la ficha se vea apretada contra los bordes.
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
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
    // Misma capa explícita que en `CarCard`: aquí el corazón sí respondía, pero
    // por el orden en que caen los hermanos, no porque esté declarado. Dejarlo
    // escrito evita que un cambio de orden lo rompa sin que nadie lo note.
    zIndex: 1,
    elevation: 1,
  },
});
