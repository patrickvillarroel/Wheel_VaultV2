import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fab, FAB_CLEARANCE } from '../../../components/ui/Fab';
import { FavoriteButton } from '../../../components/ui/FavoriteButton';
import { Screen } from '../../../components/ui/Screen';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { ErrorState, LoadingState } from '../../../components/ui/StateViews';
import { CarImage } from '../../../features/cars/components/CarImage';
import { useCar, useDeleteCar, useToggleFavorite } from '../../../features/cars/hooks';
import { useCarImageUrl } from '../../../features/cars/useCarImage';
import { colors, radii, spacing, typography, TOUCH_TARGET } from '../../../theme';

/**
 * Alto de la cabecera fotográfica como fracción del ancho de pantalla.
 *
 * Se mide contra el ancho y no contra el alto porque el blister es la pieza
 * que manda: así ocupa la misma proporción en un móvil pequeño y en uno
 * grande, en vez de estirarse en las pantallas largas.
 */
const HERO_RATIO = 0.72;

/** Proporción de la foto principal: los blisters son verticales. */
const PHOTO_RATIO = 4 / 5;

export default function CarDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const { data: car, isLoading, isError, error, refetch } = useCar(id);
  const toggleFavorite = useToggleFavorite();
  const deleteCar = useDeleteCar();

  // La misma URL firmada que usa `CarImage`: TanStack Query la comparte, así
  // que el fondo difuminado no cuesta una segunda petición.
  const { data: imageUrl } = useCarImageUrl(car?.image_path ?? null);

  const [isDeleting, setIsDeleting] = useState(false);

  function confirmDelete() {
    if (!car) return;

    Alert.alert(
      'Eliminar carrito',
      `¿Seguro que quieres eliminar «${car.model}»? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            setIsDeleting(true);
            deleteCar.mutate(car.id, {
              // Se vuelve atrás solo si de verdad se borró: navegar antes de
              // saberlo dejaría al usuario creyendo que funcionó cuando no.
              onSuccess: () => router.back(),
              onError: (err) => {
                setIsDeleting(false);
                Alert.alert(
                  'No se pudo eliminar',
                  err instanceof Error ? err.message : 'Inténtalo de nuevo.',
                );
              },
            });
          },
        },
      ],
    );
  }

  if (isLoading) {
    return (
      <Screen edges={['top']}>
        <ScreenHeader title="Carrito" showBack />
        <LoadingState />
      </Screen>
    );
  }

  if (isError || !car) {
    return (
      <Screen edges={['top']}>
        <ScreenHeader title="Carrito" showBack />
        <ErrorState
          message={error instanceof Error ? error.message : 'No se encontró el carrito'}
          onRetry={() => void refetch()}
        />
      </Screen>
    );
  }

  /**
   * Las filas del diseño, siempre las seis y en este orden.
   *
   * Los campos vacíos muestran un guion en vez de desaparecer: una tarjeta que
   * cambia de alto según el auto se lee como un fallo, y el hueco invita a
   * completarlo desde el botón de editar.
   */
  const rows = [
    { label: 'Marca', value: car.vehicle_make, icon: 'pricetag' as const },
    { label: 'Modelo', value: car.model, icon: 'car-sport' as const },
    { label: 'Fabricante', value: car.brand?.name ?? null, icon: 'business' as const },
    { label: 'Año', value: car.year ? String(car.year) : null, icon: 'calendar' as const },
    { label: 'Descripción', value: car.description, icon: 'document-text' as const },
    { label: 'Cantidad', value: String(car.quantity), icon: 'cube' as const },
  ];

  const heroHeight = insets.top + Math.round(width * HERO_RATIO);

  return (
    <Screen edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { height: heroHeight, paddingTop: insets.top + spacing.sm }]}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              // El desenfoque convierte la propia foto en fondo. Sin él, la
              // imagen a pantalla completa compite con la que de verdad
              // queremos mirar.
              blurRadius={40}
              cachePolicy="memory-disk"
            />
          ) : null}

          {/*
            Oscurece el fondo para que la foto y los botones flotantes
            destaquen, y cierra en negro abajo para que la cabecera no corte de
            golpe contra la tarjeta.
          */}
          <LinearGradient
            colors={['rgba(10, 10, 10, 0.55)', 'rgba(10, 10, 10, 0.35)', colors.background]}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />

          <CarImage path={car.image_path} style={styles.photo} iconSize={56} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitles}>
              <Text style={styles.cardTitle}>Información de Carrito</Text>
              <View style={styles.rule} />
            </View>

            <View style={styles.favorite}>
              <FavoriteButton
                isFavorite={car.is_favorite}
                onToggle={() => toggleFavorite.mutate({ id: car.id, isFavorite: !car.is_favorite })}
                label={car.model}
                size={24}
              />
            </View>
          </View>

          {rows.map((row) => (
            <View key={row.label} style={styles.row}>
              <View style={styles.rowIcon}>
                <Ionicons name={row.icon} size={20} color={colors.red} />
              </View>

              <View style={styles.rowTexts}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowValue}>{row.value ?? '—'}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/*
        Flotan sobre la foto, no sobre una cabecera: el diseño no tiene barra
        superior, la imagen arranca en el borde de la pantalla.
      */}
      <View style={[styles.floating, { top: insets.top + spacing.xs }]} pointerEvents="box-none">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={({ pressed }) => [styles.glassButton, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>

        <Pressable
          onPress={confirmDelete}
          disabled={isDeleting}
          accessibilityRole="button"
          accessibilityLabel="Eliminar carrito"
          style={({ pressed }) => [styles.glassButton, pressed && styles.pressed]}
        >
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </Pressable>
      </View>

      <Fab
        icon="create-outline"
        label={`Editar ${car.model}`}
        onPress={() => router.push({ pathname: '/car/[id]/edit', params: { id: car.id } })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: FAB_CLEARANCE,
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: spacing.xl,
    // El degradado y la foto difuminada se salen de la caja si no se recorta.
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  /**
   * El alto manda y el ancho sale de la proporción: así la foto llena la
   * cabecera entera sin tener que calcular píxeles a mano para cada móvil.
   */
  photo: {
    flex: 1,
    aspectRatio: PHOTO_RATIO,
    alignSelf: 'center',
    borderRadius: radii.lg,
  },
  floating: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  glassButton: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 10, 10, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  card: {
    marginHorizontal: spacing.lg,
    // Sube sobre el degradado para que cabecera y tarjeta se solapen, como en
    // el diseño, en vez de quedar apiladas.
    marginTop: -spacing.xxl,
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  cardTitles: {
    flex: 1,
  },
  cardTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  /** La barra roja del diseño: no subraya el título entero, solo lo ancla. */
  rule: {
    width: 56,
    height: 3,
    borderRadius: radii.full,
    backgroundColor: colors.red,
    marginTop: spacing.sm,
  },
  favorite: {
    borderRadius: radii.md,
    backgroundColor: colors.redSoft,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.redSoft,
  },
  rowTexts: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  rowValue: {
    ...typography.body,
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.7,
  },
});
