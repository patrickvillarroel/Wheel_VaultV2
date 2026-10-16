import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, radii, spacing, typography, TOUCH_TARGET } from '../../theme';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  /** Icono a la izquierda, como en el diseño del login. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Mensaje de validación. Su presencia pinta el campo en rojo. */
  error?: string | undefined;
  /** Añade el ojo para mostrar u ocultar el texto. */
  isPassword?: boolean;
  /**
   * Etiqueta accesible. El diseño usa solo placeholder, que desaparece al
   * escribir y deja el campo sin nombre para un lector de pantalla.
   */
  label: string;
}

export function TextField({
  icon,
  error,
  isPassword = false,
  label,
  ...inputProps
}: TextFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isHidden, setIsHidden] = useState(isPassword);

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.field,
          isFocused && styles.fieldFocused,
          Boolean(error) && styles.fieldError,
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={20}
            color={error ? colors.danger : isFocused ? colors.red : colors.textMuted}
          />
        ) : null}

        <TextInput
          {...inputProps}
          accessibilityLabel={label}
          secureTextEntry={isHidden}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          onFocus={(event) => {
            setIsFocused(true);
            inputProps.onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            inputProps.onBlur?.(event);
          }}
        />

        {isPassword ? (
          <Pressable
            onPress={() => setIsHidden((hidden) => !hidden)}
            hitSlop={spacing.md}
            accessibilityRole="button"
            accessibilityLabel={isHidden ? 'Mostrar contraseña' : 'Ocultar contraseña'}
          >
            <Ionicons
              name={isHidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: TOUCH_TARGET + 8,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
  },
  fieldFocused: {
    borderColor: colors.red,
  },
  fieldError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    // Sin esto, en Android el texto queda desplazado hacia arriba.
    paddingVertical: spacing.md,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    paddingHorizontal: spacing.xs,
  },
});
