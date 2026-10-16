import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Wordmark } from '../../../components/ui/Wordmark';
import { colors, gradients, radii, spacing, typography, TOUCH_TARGET } from '../../../theme';

/** Proporción de CarHome.png (334x279). Ata el alto al ancho que calculemos. */
const CAR_ASPECT = 334 / 279;

/**
 * Cuánto del ancho de pantalla ocupa el coche.
 *
 * El coche acompaña al nombre, no compite con él: ocupa poco más de la mitad
 * derecha y se sale por el borde. Atarlo al ancho de pantalla en vez de fijar
 * píxeles es lo que hace que se vea igual en un iPhone SE que en un Pixel 8 Pro.
 */
const CAR_WIDTH_RATIO = 0.56;

/** Tope para tablets: pasado este ancho el coche dejaría de ser un detalle. */
const CAR_MAX_WIDTH = 280;

/**
 * Cabecera de la pantalla de inicio: degradado rojo, logotipo y el coche.
 *
 * El mockup lleva además un botón de menú hamburguesa y una campana de
 * notificaciones. Quedan fuera por decisión de producto: no hay menú lateral
 * ni notificaciones, y la barra solo necesita el acceso al perfil.
 */
export function HomeHero({ onPressProfile }: { onPressProfile: () => void }) {
  // El hero pinta por debajo de la barra de estado, así que el contenido tiene
  // que bajar él mismo lo que mida la muesca del dispositivo.
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const carWidth = Math.min(width * CAR_WIDTH_RATIO, CAR_MAX_WIDTH);

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
        style={[styles.car, { width: carWidth, height: carWidth / CAR_ASPECT }]}
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

        {/*
          A tamaño completo y sin velocímetro: en el hero el nombre es el
          protagonista y el icono solo le robaba alto.
        */}
        <Wordmark size="large" align="left" showGauge={false} />

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
    // Este hueco es lo que marca el alto del hero, y con él la altura a la que
    // queda el coche: sin suficiente aire, el coche sube y pisa el nombre.
    paddingBottom: spacing.huge,
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
    maxWidth: '52%',
  },
  taglineStrong: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  car: {
    position: 'absolute',
    // El morro se sale del hero por la derecha, como en el diseño: el recorte
    // lo hace el overflow:'hidden' de la raíz. El alto y el ancho los calcula
    // el componente a partir del ancho de pantalla.
    right: -spacing.lg,
    bottom: -spacing.sm,
  },
});
