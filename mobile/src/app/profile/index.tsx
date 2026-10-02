import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ErrorState, LoadingState } from '../../components/ui/StateViews';
import { useMe } from '../../features/profile/hooks';
import { colors, radii, spacing, typography } from '../../theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useMe();

  if (isLoading) {
    return (
      <Screen edges={['top']}>
        <ScreenHeader title="Perfil" showBack />
        <LoadingState />
      </Screen>
    );
  }

  if (isError || !data) {
    return (
      <Screen edges={['top']}>
        <ScreenHeader title="Perfil" showBack />
        <ErrorState
          message={error instanceof Error ? error.message : 'No se pudo cargar tu perfil'}
          onRetry={() => void refetch()}
        />
      </Screen>
    );
  }

  const { profile, user } = data;

  return (
    <Screen edges={['top']}>
      <ScreenHeader title="Perfil" showBack />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.display_name.charAt(0).toUpperCase()}</Text>
          </View>

          <Text style={styles.name}>{profile.display_name}</Text>
          {user.email ? <Text style={styles.email}>{user.email}</Text> : null}
        </View>

        <View style={styles.card}>
          <Row icon="person-outline" label="Nombre" value={profile.display_name} />
          <Row
            icon="mail-outline"
            label="Correo"
            value={user.email ?? '—'}
            // El correo se cambia desde Supabase Auth, con su confirmación por
            // email; no es un campo editable de este formulario.
            hint="No editable"
          />
          <Row
            icon="calendar-outline"
            label="Miembro desde"
            value={new Date(profile.created_at).toLocaleDateString('es', {
              year: 'numeric',
              month: 'long',
            })}
            isLast
          />
        </View>

        <Button
          label="Editar perfil"
          icon="create-outline"
          onPress={() => router.push('/profile/edit')}
        />
      </ScrollView>
    </Screen>
  );
}

function Row({
  icon,
  label,
  value,
  hint,
  isLast = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  hint?: string;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <Ionicons name={icon} size={18} color={colors.textMuted} />

      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      </View>

      {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.huge,
    gap: spacing.xl,
  },
  identity: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radii.full,
    backgroundColor: colors.redSoft,
    borderWidth: 2,
    borderColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.red,
  },
  name: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  email: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  rowValue: {
    ...typography.body,
    color: colors.textPrimary,
  },
  rowHint: {
    ...typography.label,
    color: colors.textMuted,
  },
});
