import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { colors, radii, spacing, typography, TOUCH_TARGET } from '../../theme';

export interface Chip {
  key: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isActive: boolean;
  onPress: () => void;
}

/**
 * Barra horizontal de filtros, como la del diseño.
 *
 * Es deslizable a propósito: las marcas que el usuario tenga pueden ser muchas
 * y recortarlas a las que quepan en pantalla escondería filtros sin avisar.
 */
export function FilterChips({ chips }: { chips: Chip[] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // `flexGrow: 0` no es opcional: el estilo base de ScrollView en React
      // Native lo trae a 1, así que como hijo de una columna flex se estira
      // hasta ocupar toda la pantalla y empuja el contenido hacia abajo.
      style={styles.scroll}
      contentContainerStyle={styles.row}
      // Permite pulsar un filtro con el teclado abierto sin tener que cerrarlo
      // antes, que es lo que pasa al venir del buscador.
      keyboardShouldPersistTaps="handled"
    >
      {chips.map((chip) => (
        <Pressable
          key={chip.key}
          onPress={chip.onPress}
          accessibilityRole="button"
          accessibilityLabel={chip.label}
          accessibilityState={{ selected: chip.isActive }}
          style={({ pressed }) => [
            styles.chip,
            chip.isActive && styles.chipActive,
            pressed && styles.pressed,
          ]}
        >
          {chip.icon ? (
            <Ionicons
              name={chip.icon}
              size={16}
              color={chip.isActive ? colors.red : colors.textSecondary}
            />
          ) : null}

          <Text style={[styles.label, chip.isActive && styles.labelActive]} numberOfLines={1}>
            {chip.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  row: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: TOUCH_TARGET,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.red,
    backgroundColor: colors.redSoft,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
  },
  labelActive: {
    color: colors.red,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
