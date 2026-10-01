import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { signOut } from '../../features/auth/api';
import { useMe } from '../../features/profile/hooks';
import { colors, radii, spacing, typography } from '../../theme';

/**
 * Pantalla "Más": por ahora el perfil y el cierre de sesión.
 *
 * Es la primera que consume la API de Express, así que también sirve para
 * comprobar de un vistazo que el token viaja y que /me responde.
 */
export default function MoreScreen() {
  const { data, isLoading, isError, error, refetch } = useMe();
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
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Más</Text>

        {isLoading ? (
          <View style={styles.card}>
            <ActivityIndicator color={colors.red} />
          </View>
        ) : isError ? (
          <View style={styles.stack}>
            <Banner
              tone="error"
              message={error instanceof Error ? error.message : 'No se pudo cargar tu perfil'}
            />
            <Button label="Reintentar" variant="secondary" onPress={() => void refetch()} />
          </View>
        ) : data ? (
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {data.profile.display_name.charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={styles.identity}>
              <Text style={styles.name}>{data.profile.display_name}</Text>
              {data.user.email ? <Text style={styles.email}>{data.user.email}</Text> : null}
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="construct-outline" size={20} color={colors.textMuted} />
            <Text style={styles.rowText}>Editar perfil y ajustes llegan en la fase 9</Text>
          </View>
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

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  heading: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  stack: {
    gap: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    minHeight: 72,
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
  identity: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  email: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  rowText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
});
