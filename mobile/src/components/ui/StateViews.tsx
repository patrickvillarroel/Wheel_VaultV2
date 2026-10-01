import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageSource } from 'expo-image';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { Button } from './Button';

/**
 * Los tres estados que toda pantalla con datos remotos necesita.
 *
 * Una lista vacía no es lo mismo que una lista que falló al cargar, y ninguna
 * de las dos es una pantalla en blanco. Tenerlos como componentes evita que
 * cada pantalla improvise el suyo.
 */

export function LoadingState({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.red} size="large" />
      {label ? <Text style={styles.description}>{label}</Text> : null}
    </View>
  );
}

export function EmptyState({
  icon,
  illustration,
  title,
  description,
  actionLabel,
  onAction,
}: {
  /** Marcador genérico. Se ignora si hay `illustration`. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Ilustración propia del diseño; tiene prioridad sobre el icono. */
  illustration?: ImageSource | number;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.center}>
      {illustration !== undefined ? (
        <Image
          source={illustration}
          style={styles.illustration}
          contentFit="contain"
          // Decorativa: el título y la descripción que van debajo ya dicen lo
          // que pasa, y repetirlo sería ruido para un lector de pantalla.
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      ) : icon ? (
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={36} color={colors.textMuted} />
        </View>
      ) : null}

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button label={actionLabel} onPress={onAction} icon="add" />
        </View>
      ) : null}
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: (() => void) | undefined;
}) {
  return (
    <View style={styles.center}>
      <View style={[styles.iconCircle, styles.iconCircleError]}>
        <Ionicons name="cloud-offline-outline" size={36} color={colors.danger} />
      </View>

      <Text style={styles.title}>Algo salió mal</Text>
      <Text style={styles.description}>{message}</Text>

      {onRetry ? (
        <View style={styles.action}>
          <Button label="Reintentar" variant="secondary" onPress={onRetry} icon="refresh" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.huge,
  },
  illustration: {
    // El recurso mide 218x178; a este tamaño se ve nítido sin ampliarlo.
    width: 140,
    height: 114,
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  iconCircleError: {
    borderColor: 'rgba(255, 77, 79, 0.35)',
    backgroundColor: colors.dangerSoft,
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
  action: {
    marginTop: spacing.md,
    alignSelf: 'stretch',
  },
});
