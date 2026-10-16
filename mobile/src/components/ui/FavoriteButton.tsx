import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors, spacing, TOUCH_TARGET } from '../../theme';

/**
 * El corazón de favorito, con el latido al marcarlo.
 *
 * Existe como componente propio porque el mismo botón aparece en la lista, en
 * los carruseles y en el detalle: tenerlo tres veces significaba tres sitios
 * donde la etiqueta accesible o la animación podían divergir.
 *
 * La animación no es adorno. El cambio de contorno a relleno es sutil y en una
 * lista con varias tarjetas cuesta ver cuál se marcó; el golpe de escala lo
 * señala sin necesidad de un mensaje.
 */
export function FavoriteButton({
  isFavorite,
  onToggle,
  label,
  size = 22,
}: {
  isFavorite: boolean;
  onToggle: () => void;
  /** Nombre del auto, para que el botón se anuncie con contexto. */
  label: string;
  size?: number;
}) {
  const scale = useSharedValue(1);

  // Hay quien tiene activado "reducir movimiento" porque las animaciones le
  // provocan mareo. En ese caso el icono cambia sin más.
  const prefersReducedMotion = useReducedMotion();

  // `.get()` y `.set()` en lugar de `.value`: con el React Compiler activado
  // —lo está en app.json— mutar `.value` directamente se rechaza como
  // modificación de un valor que debería ser inmutable.
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  function handlePress() {
    if (!prefersReducedMotion) {
      scale.set(
        isFavorite
          ? // Al desmarcar basta un encogimiento: celebrar que algo se quita
            // sería ruido.
            withSequence(withTiming(0.8, { duration: 90 }), withSpring(1))
          : // Al marcar, el latido: se hunde y rebota pasándose de 1.
            withSequence(
              withTiming(0.7, { duration: 90 }),
              withSpring(1, { damping: 5, stiffness: 240 }),
            ),
      );
    }

    onToggle();
  }

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={spacing.sm}
      accessibilityRole="button"
      accessibilityLabel={
        isFavorite ? `Quitar ${label} de favoritos` : `Marcar ${label} como favorito`
      }
      accessibilityState={{ selected: isFavorite }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      {/*
        Se anima un View que envuelve el icono, no el icono.
        `createAnimatedComponent(Ionicons)` revienta en tiempo de ejecución con
        "this._icon.setNativeProps is not a function": Ionicons es un componente
        de clase que no expone un nodo nativo que Reanimated pueda tocar.
      */}
      <Animated.View style={animatedStyle}>
        <Ionicons
          name={isFavorite ? 'heart' : 'heart-outline'}
          size={size}
          color={isFavorite ? colors.red : colors.textMuted}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
