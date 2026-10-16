import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography, TOUCH_TARGET } from '../../theme';

/**
 * Cabecera de pantalla con título y, opcionalmente, botón de volver.
 *
 * Se usa en lugar de la cabecera nativa del Stack para que el estilo sea
 * exactamente el del diseño en las dos plataformas.
 */
export function ScreenHeader({
  title,
  subtitle,
  showBack = false,
  right,
}: {
  title: string;
  subtitle?: string | undefined;
  showBack?: boolean;
  right?: ReactNode;
}) {
  const router = useRouter();

  return (
    <View style={styles.root}>
      {showBack ? (
        <Pressable
          onPress={() => router.back()}
          hitSlop={spacing.sm}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
      ) : null}

      <View style={styles.titles}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  back: {
    width: TOUCH_TARGET - 8,
    height: TOUCH_TARGET - 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.sm,
  },
  titles: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
