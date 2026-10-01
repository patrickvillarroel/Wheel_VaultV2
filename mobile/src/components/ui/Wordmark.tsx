import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme';

/**
 * El logotipo: el velocímetro sobre "Collector's Project".
 *
 * El velocímetro es el recurso real del diseño. El texto sigue siendo una
 * aproximación con la tipografía del sistema en cursiva y peso máximo: la
 * fuente display del Figma no está licenciada. Si algún día llega, lo correcto
 * es exportar el conjunto completo como una sola imagen y sustituir este
 * componente entero, no buscar una fuente "parecida".
 */
export function Wordmark({
  size = 'large',
  align = 'center',
}: {
  size?: 'large' | 'small';
  /** Centrado en las pantallas de autenticación; a la izquierda en el hero. */
  align?: 'center' | 'left';
}) {
  const scale = size === 'large' ? 1 : 0.55;
  const isLeft = align === 'left';

  return (
    <View
      style={[styles.root, isLeft && styles.rootLeft]}
      accessibilityRole="header"
      accessibilityLabel="Collector's Project"
    >
      <Image
        source={require('../../../assets/images/Velocimetro.png')}
        style={[
          { width: 100 * scale, height: 69 * scale },
          // Centrado sobre el texto en vertical; en el hero el bloque entero
          // va a la izquierda, así que el velocímetro lo sigue.
          !isLeft && styles.gaugeCentered,
        ]}
        contentFit="contain"
        // El texto de al lado ya describe el logotipo; anunciarlo otra vez
        // sería ruido para un lector de pantalla.
        accessibilityElementsHidden
        importantForAccessibility="no"
      />

      <Text
        style={[
          styles.line,
          styles.top,
          isLeft && styles.lineLeft,
          { fontSize: 44 * scale, lineHeight: 48 * scale },
        ]}
      >
        Collector&apos;s
      </Text>
      <Text
        style={[
          styles.line,
          styles.bottom,
          isLeft && styles.lineLeft,
          { fontSize: 44 * scale, lineHeight: 48 * scale },
        ]}
      >
        Project
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
  },
  rootLeft: {
    alignItems: 'flex-start',
  },
  gaugeCentered: {
    alignSelf: 'center',
  },
  line: {
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -1,
    textAlign: 'center',
  },
  lineLeft: {
    textAlign: 'left',
  },
  top: {
    color: colors.textPrimary,
    // El velocímetro se apoya sobre el texto, como en el diseño.
    marginTop: -6,
  },
  bottom: {
    color: colors.red,
    marginTop: -6,
  },
});
