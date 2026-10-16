import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, radii } from '../../theme';

/**
 * Marco de neón que late, para señalar un carrito favorito en una lista.
 *
 * El corazón ya dice cuáles son favoritos, pero hay que buscarlo en cada
 * tarjeta; el marco se ve sin leer nada. El latido es lo que lo separa de un
 * borde de color cualquiera, que en una lista oscura se confunde con el borde
 * normal de la tarjeta.
 *
 * Se dibuja encima del contenido y con `pointerEvents` desactivado: es una
 * marca visual, no algo que se pueda pulsar.
 */

/** Lo que tarda en ir de apagado a encendido. Lento a propósito: respira, no parpadea. */
const PULSE = 1600;

/** Lo más tenue que llega a ponerse. Nunca se apaga del todo: el favorito sigue siéndolo. */
const DIM = 0.4;

/**
 * Por defecto, el radio de la tarjeta menos su borde.
 *
 * El marco se coloca por dentro de ese borde de 1 px, así que con el mismo
 * radio que la tarjeta las dos curvas no encajan y se ve un hilo doble en las
 * esquinas.
 */
const DEFAULT_RADIUS = radii.lg - 1;

export function FavoriteFrame({ radius = DEFAULT_RADIUS }: { radius?: number }) {
  // Hay quien tiene activado "reducir movimiento" porque las animaciones le
  // provocan mareo. Ahí el marco se queda encendido y fijo: la información
  // —esto es un favorito— se conserva, lo que desaparece es el movimiento.
  const prefersReducedMotion = useReducedMotion();

  const pulse = useSharedValue(1);

  useEffect(() => {
    if (prefersReducedMotion) {
      pulse.set(1);
      return;
    }

    pulse.set(
      withRepeat(
        withSequence(
          // `inOut` y no lineal: un latido frena al llegar a cada extremo, y
          // sin eso el cambio de sentido se nota como un tirón.
          withTiming(DIM, { duration: PULSE, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: PULSE, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );
  }, [prefersReducedMotion, pulse]);

  /*
    Se anima la opacidad de TODO el marco, no cada capa por separado.

    El resplandor es un `boxShadow`, y Reanimated no sabe interpolar esa
    propiedad: no hay forma de animar el desenfoque. Atenuando la vista entera,
    el tubo y su halo suben y bajan juntos, que es como se comporta un neón de
    verdad al variar la corriente.
  */
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulse.get(),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.frame, { borderRadius: radius }, animatedStyle]}
    />
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,

    // Por encima de todo, incluido el corazón, que llega hasta cerca del borde.
    // No le quita el toque a nadie: la vista tiene `pointerEvents` desactivado.
    zIndex: 2,

    // El tubo: fino y claro. Un borde grueso se lee como un marco pintado;
    // un neón es una línea estrecha y muy brillante.
    borderWidth: 1.5,
    borderColor: colors.neon,

    /*
      El resplandor, hacia dentro.

      Tiene que ser `inset` porque la tarjeta recorta a sus bordes
      (`overflow: 'hidden'`) para que la foto no se salga de las esquinas
      redondeadas, y eso se come cualquier sombra que caiga hacia fuera.

      Son dos sombras: una corta y densa pegada al borde, que es el núcleo
      encendido, y otra amplia y suave que lo derrama sobre la tarjeta. Con una
      sola, o se ve un halo plano o se ve un borde difuso, pero no un neón.
    */
    boxShadow: [
      { offsetX: 0, offsetY: 0, blurRadius: 6, color: colors.neonGlow, inset: true },
      { offsetX: 0, offsetY: 0, blurRadius: 18, color: colors.redSoft, inset: true },
    ],
  },
});
