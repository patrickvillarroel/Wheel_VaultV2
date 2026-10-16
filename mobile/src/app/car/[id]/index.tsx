import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { FavoriteButton } from '../../../components/ui/FavoriteButton';
import { Screen } from '../../../components/ui/Screen';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { ErrorState, LoadingState } from '../../../components/ui/StateViews';
import { CarImage } from '../../../features/cars/components/CarImage';
import { useCar, useDeleteCar, useToggleFavorite } from '../../../features/cars/hooks';
import { useCarImageUrl } from '../../../features/cars/useCarImage';
import { colors, radii, spacing, typography, TOUCH_TARGET } from '../../../theme';

/**
 * Proporción de un blister de die-cast: 4.25 × 6.50 pulgadas, el formato de
 * casi todo Hot Wheels. Es lo que hay en la mayoría de la colección, así que
 * el marco de la foto se dimensiona para ese cartón y no al revés.
 */
const BLISTER_RATIO = 4.25 / 6.5;

/**
 * Cuánto del ancho del marco ocupa el blister. El resto son los lados, que
 * rellena la foto difuminada.
 *
 * Dejar ese margen no es decoración: una foto nunca sale encuadrada al
 * milímetro, y un marco justo recortaría el cartón o lo pegaría al borde.
 */
const BLISTER_WIDTH_SHARE = 0.75;

/**
 * Proporción del marco (ancho / alto) para que un blister quepa entero
 * ocupando esa fracción del ancho. Sale ≈ 0.87, casi cuadrado: más alto que
 * ancho basta, no hace falta un marco tan vertical como el propio cartón.
 */
const HERO_RATIO = BLISTER_RATIO / BLISTER_WIDTH_SHARE;

export default function CarDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: car, isLoading, isError, error, refetch } = useCar(id);
  const toggleFavorite = useToggleFavorite();
  const deleteCar = useDeleteCar();

  // La misma URL firmada que pinta `CarImage`: TanStack Query la comparte, así
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

  const specs = [
    { label: 'Fabricante', value: car.brand?.name ?? '—', icon: 'pricetag-outline' as const },
    {
      label: 'Marca del vehículo',
      value: car.vehicle_make ?? '—',
      icon: 'business-outline' as const,
    },
    { label: 'Año', value: car.year ? String(car.year) : '—', icon: 'calendar-outline' as const },
    { label: 'Cantidad', value: String(car.quantity), icon: 'layers-outline' as const },
  ];

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        title={car.model}
        subtitle={car.brand?.name}
        showBack
        right={
          <FavoriteButton
            isFavorite={car.is_favorite}
            onToggle={() => toggleFavorite.mutate({ id: car.id, isFavorite: !car.is_favorite })}
            label={car.model}
            size={26}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/*
          La foto va entera, sin recortar: un blister es vertical y con `cover`
          se perdía medio cartón por los lados. El marco tiene la proporción
          justa para que entre completo (ver HERO_RATIO), y lo que sobre a los
          lados —una foto más apaisada, un cartón de otro formato— lo rellena
          la propia foto difuminada, que queda mejor que unas franjas grises.
        */}
        <View style={styles.hero}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              blurRadius={40}
              cachePolicy="memory-disk"
            />
          ) : null}

          <CarImage path={car.image_path} style={styles.image} contentFit="contain" iconSize={56} />
        </View>

        <View style={styles.specs}>
          {specs.map((spec) => (
            <View key={spec.label} style={styles.spec}>
              {/*
                El icono en rojo de marca, no en gris: es lo único que
                diferencia una fila de otra de un vistazo, y en gris se perdía
                contra el fondo de la tarjeta.
              */}
              <Ionicons name={spec.icon} size={18} color={colors.red} />
              <Text style={styles.specLabel}>{spec.label}</Text>
              <Text style={styles.specValue} numberOfLines={2}>
                {spec.value}
              </Text>
            </View>
          ))}
        </View>

        {car.description ? (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>Notas</Text>
            <Text style={styles.notesText}>{car.description}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button
            label="Editar"
            variant="secondary"
            icon="create-outline"
            onPress={() => router.push({ pathname: '/car/[id]/edit', params: { id: car.id } })}
          />
          <Pressable
            onPress={confirmDelete}
            disabled={isDeleting}
            accessibilityRole="button"
            accessibilityLabel="Eliminar carrito"
            style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
          >
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={styles.deleteText}>{isDeleting ? 'Eliminando…' : 'Eliminar carrito'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  },
  favorite: {
    width: TOUCH_TARGET - 8,
    height: TOUCH_TARGET - 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    width: '100%',
    aspectRatio: HERO_RATIO,
    borderRadius: radii.lg,
    // Sin esto el fondo difuminado se sale por las esquinas redondeadas.
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  specs: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  spec: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  specLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  specValue: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
    flexShrink: 1,
    textAlign: 'right',
  },
  notes: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  notesTitle: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  notesText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  delete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: TOUCH_TARGET,
  },
  deleteText: {
    ...typography.bodyStrong,
    color: colors.danger,
  },
  pressed: {
    opacity: 0.7,
  },
});
