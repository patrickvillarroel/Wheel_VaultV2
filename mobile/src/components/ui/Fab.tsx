import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet } from 'react-native';
import { colors, gradients, radii, spacing } from '../../theme';

/**
 * Botón de acción flotante, el "+" rojo del diseño.
 *
 * Las listas que lo usan tienen que reservar espacio al final de su scroll
 * (`FAB_CLEARANCE`): en el Figma el botón tapa la última tarjeta, y eso
 * convierte el último elemento en algo que no se puede pulsar.
 */
export const FAB_CLEARANCE = 96;

export function Fab({
  onPress,
  label,
  icon = 'add',
}: {
  onPress: () => void;
  label: string;
  /** Por defecto el "+" de las listas; el detalle lo usa para editar. */
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.root, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={[...gradients.brand]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Ionicons name={icon} size={icon === 'add' ? 30 : 24} color={colors.textOnBrand} />
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 60,
    height: 60,
    borderRadius: radii.full,
    overflow: 'hidden',
    // La sombra lo despega del contenido que pasa por debajo al hacer scroll.
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  pressed: {
    opacity: 0.85,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
