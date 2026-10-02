import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { signOut } from '../../features/auth/api';
import { useMe } from '../../features/profile/hooks';
import { colors, radii, spacing, typography, TOUCH_TARGET } from '../../theme';

export default function MoreScreen() {
  const router = useRouter();
  const { data } = useMe();
  const [isSigningOut, setIsSigningOut] = useState(false);

  function confirmSignOut() {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: () => {
          setIsSigningOut(true);
          // El gate de _layout.tsx lleva al login en cuanto se cierra la sesión,
          // y el AuthProvider vacía el cache de queries.
          void signOut().finally(() => setIsSigningOut(false));
        },
      },
    ]);
  }

  return (
    <Screen edges={['top']}>
      <ScreenHeader title="Más" />

      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          onPress={() => router.push('/profile')}
          accessibilityRole="button"
          accessibilityLabel="Ver tu perfil"
          style={({ pressed }) => [styles.identity, pressed && styles.pressed]}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(data?.profile.display_name ?? '?').charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={styles.identityText}>
            <Text style={styles.name} numberOfLines={1}>
              {data?.profile.display_name ?? 'Tu perfil'}
            </Text>
            {data?.user.email ? (
              <Text style={styles.email} numberOfLines={1}>
                {data.user.email}
              </Text>
            ) : null}
          </View>

          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>

        <View style={styles.menu}>
          <MenuItem
            icon="car-sport-outline"
            label="Marcas"
            onPress={() => router.push('/brands')}
          />
          <MenuItem
            icon="person-outline"
            label="Editar perfil"
            onPress={() => router.push('/profile/edit')}
            isLast
          />
        </View>

        <Button
          label="Cerrar sesión"
          variant="secondary"
          icon="log-out-outline"
          onPress={confirmSignOut}
          isLoading={isSigningOut}
        />
      </ScrollView>
    </Screen>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  isLast = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.item, isLast && styles.itemLast, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={20} color={colors.textSecondary} />
      <Text style={styles.itemLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  identityText: {
    flex: 1,
    gap: 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radii.full,
    backgroundColor: colors.redSoft,
    borderWidth: 1,
    borderColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.h2,
    color: colors.red,
  },
  name: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  email: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  menu: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: TOUCH_TARGET + 8,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemLast: {
    borderBottomWidth: 0,
  },
  itemLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
  },
});
