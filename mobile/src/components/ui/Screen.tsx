import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors } from '../../theme';

/**
 * Contenedor de pantalla: fondo de la app y margenes seguros.
 *
 * Centraliza el color de fondo para que ninguna pantalla se olvide y aparezca
 * un parpadeo blanco al navegar.
 */
export function Screen({
  children,
  edges = ['top', 'bottom'],
}: {
  children: ReactNode;
  edges?: readonly Edge[];
}) {
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1 },
});
