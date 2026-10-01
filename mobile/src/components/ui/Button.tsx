import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, gradients, radii, spacing, typography, TOUCH_TARGET } from '../../theme';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  /** Muestra un indicador y bloquea el boton: evita envios duplicados. */
  isLoading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  icon,
  fullWidth = true,
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  const content = (
    <View style={styles.content}>
      {isLoading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.textOnBrand : colors.textPrimary}
        />
      ) : (
        <>
          <Text style={[styles.label, variant === 'ghost' && styles.labelGhost]}>{label}</Text>
          {icon ? (
            <Ionicons
              name={icon}
              size={18}
              color={variant === 'ghost' ? colors.red : colors.textPrimary}
            />
          ) : null}
        </>
      )}
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        // El feedback al pulsar es parte de la usabilidad, no decoración: sin
        // el, en una red lenta parece que el boton no respondio.
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={[...gradients.brand]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {content}
        </LinearGradient>
      ) : (
        content
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: TOUCH_TARGET + 8,
    borderRadius: radii.md,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  secondary: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.xl,
  },
  ghost: {
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.md,
    minHeight: TOUCH_TARGET,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  label: {
    ...typography.button,
    color: colors.textPrimary,
  },
  labelGhost: {
    ...typography.bodyStrong,
    color: colors.red,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.45,
  },
});
