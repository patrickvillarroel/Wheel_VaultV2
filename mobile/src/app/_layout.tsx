import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../features/auth/AuthContext';
import { queryClient } from '../lib/queryClient';
import { colors } from '../theme';

/**
 * Pantallas del grupo (auth) accesibles CON sesión abierta.
 *
 * El enlace de recuperación de contraseña abre la app ya autenticado —ese es el
 * mecanismo de Supabase—, así que sin esta excepción el gate te sacaria de la
 * pantalla de cambiar la contraseña justo al llegar a ella.
 */
const PUBLIC_WHEN_AUTHENTICATED = new Set(['reset-password']);

function SessionGate() {
  const { isRestoring, isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Mientras se restaura la sesión guardada no se decide nada: redirigir aquí
    // produciría el parpadeo login -> home en cada arranque.
    if (isRestoring) return;

    // Con `typedRoutes` activado, useSegments() devuelve una tupla cuyo tipo
    // depende de la ruta actual, así que TypeScript no deja indexar el segundo
    // elemento de forma genérica. En tiempo de ejecucion es un array de strings.
    const [group, route] = segments as readonly (string | undefined)[];

    const inAuthGroup = group === '(auth)';
    const currentRoute = route ?? '';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/login');
      return;
    }

    if (isAuthenticated && inAuthGroup && !PUBLIC_WHEN_AUTHENTICATED.has(currentRoute)) {
      router.replace('/');
    }
  }, [isRestoring, isAuthenticated, segments, router]);

  if (isRestoring) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={colors.red} size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade',
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      {/* AuthProvider va dentro del de queries: al cerrar sesión vacía el cache. */}
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="light" />
          <SessionGate />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
