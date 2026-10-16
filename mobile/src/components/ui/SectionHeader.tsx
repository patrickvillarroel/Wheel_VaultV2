import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';

/**
 * Cabecera de sección del diseño: barra roja vertical, título y "Ver todas".
 *
 * El enlace solo aparece si hay a dónde ir; un "Ver todas" que no lleva a
 * ningún sitio es peor que no ponerlo.
 */
export function SectionHeader({
  title,
  onSeeAll,
  seeAllLabel = 'Ver todas',
}: {
  title: string;
  onSeeAll?: () => void;
  seeAllLabel?: string;
}) {
  return (
    <View style={styles.root}>
      <View style={styles.bar} />

      <Text style={styles.title}>{title}</Text>

      {onSeeAll ? (
        <Pressable
          onPress={onSeeAll}
          hitSlop={spacing.sm}
          accessibilityRole="button"
          accessibilityLabel={`${seeAllLabel} de ${title}`}
          style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}
        >
          <Text style={styles.seeAllText}>{seeAllLabel}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  bar: {
    width: 3,
    height: 20,
    borderRadius: radii.full,
    backgroundColor: colors.red,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.6,
  },
});
