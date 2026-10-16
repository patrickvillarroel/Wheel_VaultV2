import { Ionicons } from '@expo/vector-icons';
import { CAR_LIMITS } from '@wheel-vault/shared';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography, TOUCH_TARGET } from '../../theme';

/**
 * Selector de cantidad con botones, no un campo de texto.
 *
 * Un coleccionista suele tener 1 o 2 unidades del mismo modelo: pulsar es más
 * rápido que abrir el teclado numérico, y así es imposible escribir un valor
 * inválido.
 */
export function QuantityStepper({
  value,
  onChange,
  label = 'Cantidad',
}: {
  value: number;
  onChange: (next: number) => void;
  label?: string;
}) {
  const canDecrease = value > CAR_LIMITS.quantity.min;
  const canIncrease = value < CAR_LIMITS.quantity.max;

  return (
    <View style={styles.root}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.control}>
        <Pressable
          onPress={() => onChange(value - 1)}
          disabled={!canDecrease}
          accessibilityRole="button"
          accessibilityLabel="Quitar una unidad"
          style={({ pressed }) => [
            styles.button,
            !canDecrease && styles.buttonDisabled,
            pressed && canDecrease && styles.pressed,
          ]}
        >
          <Ionicons
            name="remove"
            size={20}
            color={canDecrease ? colors.textPrimary : colors.textMuted}
          />
        </Pressable>

        <Text style={styles.value} accessibilityLabel={`${value} unidades`}>
          {value}
        </Text>

        <Pressable
          onPress={() => onChange(value + 1)}
          disabled={!canIncrease}
          accessibilityRole="button"
          accessibilityLabel="Añadir una unidad"
          style={({ pressed }) => [
            styles.button,
            !canIncrease && styles.buttonDisabled,
            pressed && canIncrease && styles.pressed,
          ]}
        >
          <Ionicons
            name="add"
            size={20}
            color={canIncrease ? colors.textPrimary : colors.textMuted}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
  },
  label: {
    ...typography.body,
    color: colors.textSecondary,
  },
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  button: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
  value: {
    ...typography.h3,
    color: colors.textPrimary,
    minWidth: 36,
    textAlign: 'center',
  },
});
