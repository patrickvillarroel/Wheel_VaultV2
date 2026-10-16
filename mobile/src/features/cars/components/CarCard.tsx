import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FavoriteButton } from '../../../components/ui/FavoriteButton';
import { FavoriteFrame } from '../../../components/ui/FavoriteFrame';
import { colors, radii, spacing, typography, TOUCH_TARGET } from '../../../theme';
import type { Car } from '../api';
import { CarImage } from './CarImage';

/** Dos líneas de título, para que "Porsche 911 GT3" no se corte en "Porsche 911…". */
const TITLE_HEIGHT = typography.bodyStrong.lineHeight * 2;

/**
 * Tarjeta de un auto en la lista, siguiendo el diseño: foto arriba, modelo,
 * fabricante y, opcionalmente, el corazón de favorito.
 *
 * El corazón solo aparece si se pasa `onToggleFavorite`. En los carruseles
 * horizontales de la pantalla de inicio no se pasa: ahí el gesto para avanzar
 * roza las tarjetas y es fácil desmarcar un favorito sin querer, con un botón
 * que además no devuelve ninguna confirmación.
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
  /** Sin esto no se dibuja el corazón y la tarjeta solo abre el detalle. */
  onToggleFavorite?: (() => void) | undefined;
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

        <View style={[styles.body, onToggleFavorite ? styles.bodyWithFavorite : null]}>
          <Text style={styles.model} numberOfLines={2}>
            {car.model}
          </Text>
          <Text style={styles.brand} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </Pressable>

      {onToggleFavorite ? (
        <View style={styles.favorite}>
          <FavoriteButton
            isFavorite={car.is_favorite}
            onToggle={onToggleFavorite}
            label={car.model}
          />
        </View>
      ) : null}

      {/* La cantidad solo se muestra cuando hay más de uno: un "1" en cada
          tarjeta es ruido que no aporta nada. */}
      {car.quantity > 1 ? (
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText}>×{car.quantity}</Text>
        </View>
      ) : null}

      {/* El último, para que el marco quede por encima de la foto, del corazón
          y de la cantidad en lugar de por debajo. */}
      {car.is_favorite ? <FavoriteFrame /> : null}
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
    gap: 2,
  },
  bodyWithFavorite: {
    // Deja sitio al corazón, que va superpuesto a la derecha. Sin corazón ese
    // hueco solo estrecharía el nombre del modelo sin motivo.
    paddingRight: TOUCH_TARGET,
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

    /**
     * Tamaño explícito y una capa por encima del área pulsable de la tarjeta.
     *
     * Sin esto el corazón se veía pero no respondía: el `Pressable` de
     * `main` ocupa la tarjeta entera y, al ser hermanos sin capa declarada,
     * quién se queda el toque depende del orden de pintado, que no es el mismo
     * en las dos plataformas. Con `zIndex` el corazón queda siempre el último
     * en pintarse y, por tanto, el primero en recibir el toque.
     *
     * `elevation` hace lo propio en Android, donde el reparto de capas lo
     * decide la elevación antes que el orden de los hijos. No añade sombra:
     * la vista no tiene fondo, así que no proyecta contorno.
     */
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    elevation: 1,
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
