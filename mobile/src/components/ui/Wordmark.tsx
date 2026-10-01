import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme';

/**
 * El logotipo "Collector's Project".
 *
 * Es una aproximacion con la tipografia del sistema en cursiva y peso máximo.
 * El diseño usa una fuente display con un corte muy concreto que no tenemos
 * licenciada: cuando llegue, lo correcto es exportarla desde Figma como SVG o
 * PNG y sustituir este componente, no buscar una fuente "parecida".
 */
export function Wordmark({ size = 'large' }: { size?: 'large' | 'small' }) {
  const scale = size === 'large' ? 1 : 0.55;

  return (
    <View accessibilityRole="header" accessibilityLabel="Collector's Project">
      <Text style={[styles.top, { fontSize: 44 * scale, lineHeight: 48 * scale }]}>
        Collector&apos;s
      </Text>
      <Text style={[styles.bottom, { fontSize: 44 * scale, lineHeight: 48 * scale }]}>Project</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    color: colors.textPrimary,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -1,
  },
  bottom: {
    color: colors.red,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -1,
    marginTop: -6,
  },
});
