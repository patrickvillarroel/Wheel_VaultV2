import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

/**
 * Scroll que se aparta del teclado.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * POR QUE `behavior="padding"` TAMBIEN EN ANDROID
 *
 * El patron habitual es `behavior={Platform.OS === 'ios' ? 'padding' :
 * undefined}`, delegando en Android al `android:windowSoftInputMode=
 * "adjustResize"` del manifiesto, que encoge la ventana al abrirse el teclado.
 *
 * Aqui eso NO funciona. Desde el SDK 54 Expo activa edge-to-edge en todas las
 * versiones de Android (de ahi `react-native-is-edge-to-edge` y los colores
 * transparentes del tema): la app dibuja por debajo de las barras del sistema
 * y la ventana ya no se encoge cuando sale el teclado. Con `behavior`
 * indefinido, `KeyboardAvoidingView` no hace absolutamente nada y el teclado
 * tapa el campo.
 *
 * Con `padding` el aparte lo calcula React Native escuchando al teclado, que
 * es independiente de que la ventana se redimensione o no. Y como no se
 * redimensiona, no hay doble compensacion.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * No resuelve el caso de un formulario largo donde el campo enfocado queda por
 * encima del area visible: para eso hace falta desplazarse hasta el, y eso
 * React Native no lo hace solo. Ver la nota al final de este archivo.
 */
export function KeyboardAwareScroll({
  children,
  contentContainerStyle,
  /**
   * Alto de lo que haya fijo encima del scroll —una cabecera, por ejemplo— que
   * `KeyboardAvoidingView` no puede medir por su cuenta.
   */
  verticalOffset = 0,
}: {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  verticalOffset?: number;
}) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior="padding"
      keyboardVerticalOffset={verticalOffset}
    >
      <ScrollView
        contentContainerStyle={contentContainerStyle}
        // Sin esto, el primer toque con el teclado abierto solo lo cierra: para
        // pulsar un boton harian falta dos toques y el primero parece ignorado.
        keyboardShouldPersistTaps="handled"
        // Arrastrar hacia abajo baja el teclado con el dedo, como en iOS nativo.
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});

/*
 * SI ESTO NO BASTA
 *
 * El siguiente escalon es `react-native-keyboard-controller`, que ademas de
 * apartar el contenido desplaza la lista hasta el campo enfocado y conoce los
 * insets de edge-to-edge. Es modulo nativo, asi que entra con una compilacion
 * nueva. Hasta que haga falta, esto cubre el caso sin dependencias.
 */
