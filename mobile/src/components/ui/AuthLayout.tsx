import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, gradients, radii, spacing, typography } from '../../theme';
import { KeyboardAwareScroll } from './KeyboardAwareScroll';
import { Screen } from './Screen';
import { Wordmark } from './Wordmark';

/**
 * Estructura comun de las pantallas de autenticación, tomada del diseño:
 * degradado oscuro, logotipo, eslogan y una tarjeta con el formulario.
 *
 * El `KeyboardAwareScroll` no es un detalle: en estas pantallas el teclado
 * tapa justo el campo de contraseña y el boton de enviar.
 */
export function AuthLayout({
  title,
  subtitle,
  icon = 'car-sport',
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  icon?: keyof typeof Ionicons.glyphMap;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Screen edges={['bottom']}>
      <Image
        source={require('../../../assets/images/fondo_login.jpg')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        // La foto aparece de golpe cuando termina de decodificar y el salto se
        // nota. Con la transición entra sobre el negro del fondo y parece
        // intencionado.
        transition={400}
        // Decorativa: no aporta nada a quien no la ve.
        accessibilityElementsHidden
        importantForAccessibility="no"
      />

      {/*
        Velo oscuro sobre la foto. No es decoracion: sin el, el texto blanco
        pierde contraste sobre las zonas claras del coche y la tarjeta se
        confunde con el fondo. Se oscurece mas hacia abajo, que es donde esta
        el formulario.
      */}
      <LinearGradient
        colors={[...gradients.scrim]}
        locations={[...gradients.scrimLocations]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAwareScroll contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Wordmark />
          <Text style={styles.tagline}>
            Tu colección, tu pasión.{'\n'}
            <Text style={styles.taglineAccent}>Tu legado.</Text>
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.badge}>
            <Ionicons name={icon} size={26} color={colors.textPrimary} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.form}>{children}</View>
        </View>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAwareScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    // 16 px de margen lateral en cualquier anchura de pantalla.
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.huge,
    gap: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    gap: spacing.md,
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  taglineAccent: {
    color: colors.red,
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'rgba(20, 20, 20, 0.92)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    // Deja sitio al circulo que sobresale por arriba.
    paddingTop: spacing.huge,
    marginTop: spacing.xxl,
    alignItems: 'stretch',
  },
  badge: {
    position: 'absolute',
    alignSelf: 'center',
    top: -28,
    width: 56,
    height: 56,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.red,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  form: {
    marginTop: spacing.xl,
    gap: spacing.lg,
  },
  footer: {
    alignItems: 'center',
  },
});
