import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AnimatedSplash } from '../components/ui/AnimatedSplash';
import { AuthProvider, useAuth } from '../features/auth/AuthContext';
import { useAuthDeepLink } from '../features/auth/useAuthDeepLink';
import { warmUpApi } from '../lib/apiClient';
import { queryClient } from '../lib/queryClient';
import { colors } from '../theme';

/**
 * La pantalla nativa se queda puesta hasta que `AnimatedSplash` dibuja su copia
 * encima. Sin esto el sistema la retira en cuanto React monta y se ve el fondo
 * desnudo durante un instante.
 *
 * Va fuera del componente porque tiene que ejecutarse al cargar el modulo, no
 * en el primer render: para entonces ya seria tarde.
 */
void SplashScreen.preventAutoHideAsync();

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

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },

        /*
         * Entrar en un detalle desliza desde la derecha y volver lo deshace:
         * el gesto cuenta de dónde vienes, que es justo lo que un fundido
         * oculta. Es además la transición nativa de ambas plataformas.
         */
        animation: 'slide_from_right',
      }}
    >
      {/*
        Los dos grupos son la excepción: entre ellos no se navega hacia dentro,
        se cambia de mundo con `replace` al abrir o cerrar sesión. Deslizar ahí
        sugeriría que hay una pantalla atrás a la que volver.
      */}
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
    </Stack>
  );
}

/**
 * Mantiene el splash encima hasta que termina de irse.
 *
 * Debajo se monta la app entera desde el primer momento, aunque la sesion aun
 * se este restaurando: el velo es opaco, asi que el usuario no ve el baile de
 * rutas del gate, y cuando el velo se va la pantalla correcta ya esta puesta.
 */
function SplashGate({ children }: { children: React.ReactNode }) {
  const { isRestoring } = useAuth();
  const [isSplashGone, setIsSplashGone] = useState(false);

  // Si la app se abrio desde un enlace de correo, el velo tambien espera a que
  // la sesión de ese enlace esté puesta. Así quien viene de "recuperar
  // contraseña" ve el formulario, no un parpadeo de "enlace no válido".
  const { isProcessing: isOpeningLink } = useAuthDeepLink();

  const handleFinish = useCallback(() => setIsSplashGone(true), []);

  return (
    <View style={styles.root}>
      {children}

      {isSplashGone ? null : (
        <AnimatedSplash isReady={!isRestoring && !isOpeningLink} onFinish={handleFinish} />
      )}
    </View>
  );
}

export default function RootLayout() {
  // Se dispara una sola vez, al abrir la app: para cuando el usuario termine de
  // iniciar sesión, el servidor ya estará despierto.
  useEffect(() => {
    warmUpApi();
  }, []);

  return (
    <SafeAreaProvider>
      {/* AuthProvider va dentro del de queries: al cerrar sesión vacía el cache. */}
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="light" />
          <SplashGate>
            <SessionGate />
          </SplashGate>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
