import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';

/**
 * Marcador de una pantalla que todavia no existe.
 *
 * Es temporal y dice que fase la trae, para que nadie —ni nosotros dentro de
 * dos semanas— se pregunte si esta rota o sin terminar.
 */
export function Placeholder({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.root}>
      <Ionicons name={icon} size={48} color={colors.textMuted} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xxxl,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  description: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
