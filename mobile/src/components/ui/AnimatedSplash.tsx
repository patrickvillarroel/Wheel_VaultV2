import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../../theme';

/**
 * Ancho del logotipo, el mismo que `imageWidth` del plugin expo-splash-screen
 * en app.json.
 *
 * Los dos numeros tienen que coincidir: esta pantalla releva a la nativa
 * dibujando lo mismo en el mismo sitio, y si difieren se ve un salto del
 * logotipo justo en el relevo.
 */
const LOGO_SIZE = 200;

/**
 * Lo que respira el logotipo mientras se espera. Mas amplitud seria mareante.
 *
 * Medio ciclo: con `MIN_DISPLAY_MS` encima da tiempo justo a una respiracion
 * completa, que es lo que hace falta para que se lea como un latido y no como
 * un temblor.
 */
const PULSE_SCALE = 1.06;
const PULSE_DURATION = 700;

/** La salida: el logotipo se va hacia el espectador y se desvanece con el velo. */
const EXIT_SCALE = 1.2;
const EXIT_DURATION = 650;

/**
 * Lo minimo que el splash se queda en pantalla, contado desde que monta.
 *
 * Sin esto la duracion de la animacion es casi irrelevante: con la sesion ya
 * en el almacen seguro, `isReady` llega en unas decenas de milisegundos y el
 * splash se va antes de haber empezado. Lo que se percibe entonces no es una
 * transicion rapida, es un parpadeo.
 *
 * No retrasa nada util: la app se monta debajo desde el primer frame y los
 * datos ya se estan pidiendo mientras esto se ve.
 */
const MIN_DISPLAY_MS = 1400;

/**
 * Splash animado que continua al nativo.
 *
 * La pantalla nativa no puede animarse: es una imagen que el sistema pinta
 * antes de que exista JavaScript. El truco habitual, y el que se usa aqui, es
 * dibujar encima una copia identica en cuanto React monta, ocultar la nativa
 * sin que se note el relevo, y animar ya la copia.
 *
 * Mientras `isReady` es falso el logotipo respira, de modo que una restauracion
 * de sesion lenta o un servidor dormido se vean como una espera viva y no como
 * una app colgada. Cuando llega, el logotipo crece y se desvanece, y entonces
 * —no antes— `onFinish` deja que el padre lo desmonte.
 */
export function AnimatedSplash({ isReady, onFinish }: { isReady: boolean; onFinish: () => void }) {
  const prefersReducedMotion = useReducedMotion();

  // `.get()` y `.set()` en lugar de `.value`: con el React Compiler activado
  // —lo está en app.json— mutar `.value` directamente se rechaza como
  // modificación de un valor que debería ser inmutable.
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const [hasShownLongEnough, setHasShownLongEnough] = useState(false);

  /**
   * Oculta la nativa cuando esta ya ha pintado, no al montar el componente.
   * Hacerlo antes descubre un frame de fondo vacio entre las dos pantallas.
   */
  const handleLayout = useCallback(() => {
    void SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setHasShownLongEnough(true), MIN_DISPLAY_MS);

    return () => clearTimeout(timer);
  }, []);

  /** La salida necesita las dos cosas: datos listos y tiempo cumplido. */
  const canExit = isReady && hasShownLongEnough;

  useEffect(() => {
    if (canExit || prefersReducedMotion) return;

    scale.set(
      withRepeat(
        withSequence(
          withTiming(PULSE_SCALE, { duration: PULSE_DURATION, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: PULSE_DURATION, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );

    // Sin esto el pulso sigue vivo durante la salida y pelea con ella.
    return () => cancelAnimation(scale);
    // Los valores compartidos son referencias estables: no son dependencias.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canExit, prefersReducedMotion]);

  useEffect(() => {
    if (!canExit) return;

    if (prefersReducedMotion) {
      onFinish();
      return;
    }

    cancelAnimation(scale);

    scale.set(
      withTiming(EXIT_SCALE, {
        duration: EXIT_DURATION,
        easing: Easing.in(Easing.cubic),
      }),
    );

    // `onFinish` desmonta esto, asi que tiene que esperar al velo y no al
    // logotipo: si se fuera antes, el ultimo frame seria un corte.
    opacity.set(
      withTiming(0, { duration: EXIT_DURATION }, (finished) => {
        if (finished) runOnJS(onFinish)();
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canExit, prefersReducedMotion, onFinish]);

  const veilStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Animated.View
      style={[styles.veil, veilStyle]}
      onLayout={handleLayout}
      // Es decorativa y efimera; anunciarla solo interrumpiria al lector de
      // pantalla antes de llegar a la pantalla de verdad.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={logoStyle}>
        <Image
          source={require('../../../assets/images/LogotipoB.png')}
          style={styles.logo}
          contentFit="contain"
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  veil: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.splash,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
});
