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
export function Wordmark({ size = 'large' }: { size?: 'large' | 'small' }) {
  const scale = size === 'large' ? 1 : 0.55;

  return (
    <View style={styles.root} accessibilityRole="header" accessibilityLabel="Collector's Project">
      <Image
        source={require('../../../assets/images/Velocimetro.png')}
        style={{ width: 100 * scale, height: 69 * scale }}
        contentFit="contain"
        // El texto de al lado ya describe el logotipo; anunciarlo otra vez
        // sería ruido para un lector de pantalla.
        accessibilityElementsHidden
        importantForAccessibility="no"
      />

      <Text style={[styles.line, styles.top, { fontSize: 44 * scale, lineHeight: 48 * scale }]}>
        Collector&apos;s
      </Text>
      <Text style={[styles.line, styles.bottom, { fontSize: 44 * scale, lineHeight: 48 * scale }]}>
        Project
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
  },
  line: {
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -1,
    textAlign: 'center',
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
