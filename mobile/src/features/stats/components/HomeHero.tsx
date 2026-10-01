import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Wordmark } from '../../../components/ui/Wordmark';
import { colors, gradients, radii, spacing, typography, TOUCH_TARGET } from '../../../theme';

/**
 * Cabecera de la pantalla de inicio: degradado rojo, logotipo y el coche.
 *
 * El diseño incluye además un botón de menú y una campana de notificaciones.
 * No están: no hay menú lateral ni notificaciones todavía, y un botón que no
 * hace nada se siente como una app rota. Entrarán con su función.
 */
export function HomeHero({ onPressProfile }: { onPressProfile: () => void }) {
  // El hero pinta por debajo de la barra de estado, así que el contenido tiene
  // que bajar él mismo lo que mida la muesca del dispositivo.
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[...gradients.hero]}
        locations={[...gradients.heroLocations]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Image
        source={require('../../../../assets/images/CarHome.png')}
        style={styles.car}
        contentFit="contain"
        transition={400}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />

      <View style={[styles.content, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.topBar}>
          <Pressable
            onPress={onPressProfile}
            accessibilityRole="button"
            accessibilityLabel="Tu perfil"
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Ionicons name="person-circle-outline" size={26} color={colors.textPrimary} />
          </Pressable>
        </View>

        <Wordmark size="small" align="left" />

        <Text style={styles.tagline}>
          Tu colección, tu pasión,{'\n'}
          <Text style={styles.taglineStrong}>tu legado.</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    borderBottomLeftRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
    backgroundColor: colors.redDark,
  },
  content: {
    paddingHorizontal: spacing.lg,
    // Deja aire bajo el eslogan para que el coche no empuje al texto.
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  iconButton: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  pressed: {
    opacity: 0.7,
  },
  tagline: {
    ...typography.caption,
    color: colors.textSecondary,
    // Deja sitio al coche, que se superpone por la derecha.
    maxWidth: '62%',
  },
  taglineStrong: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  car: {
    position: 'absolute',
    // Ancho y posición calculados para que el coche empiece a la derecha del
    // logotipo: con 230 px se montaba encima y el texto quedaba ilegible.
    right: -spacing.xl,
    bottom: -spacing.md,
    width: 200,
    height: 167,
  },
});
