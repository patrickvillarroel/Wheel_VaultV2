import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';

type Tone = 'error' | 'success';

/**
 * Mensaje a nivel de formulario: el error que devuelve el servidor, o la
 * confirmación de que se envio un correo.
 *
 * `accessibilityLiveRegion` hace que un lector de pantalla lo anuncie al
 * aparecer; si no, alguien que no ve la pantalla no se entera de que su intento
 * de iniciar sesión fallo.
 */
export function Banner({ tone, message }: { tone: Tone; message: string }) {
  const isError = tone === 'error';

  return (
    <View
      style={[styles.base, isError ? styles.error : styles.success]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Ionicons
        name={isError ? 'alert-circle-outline' : 'checkmark-circle-outline'}
        size={20}
        color={isError ? colors.danger : colors.success}
      />
      <Text style={[styles.text, { color: isError ? colors.danger : colors.success }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  error: {
    backgroundColor: colors.dangerSoft,
    borderColor: 'rgba(255, 77, 79, 0.35)',
  },
  success: {
    backgroundColor: 'rgba(43, 191, 106, 0.12)',
    borderColor: 'rgba(43, 191, 106, 0.35)',
  },
  text: {
    ...typography.caption,
    flex: 1,
  },
});
