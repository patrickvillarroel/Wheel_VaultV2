import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { Screen } from '../../../components/ui/Screen';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { ErrorState, LoadingState } from '../../../components/ui/StateViews';
import { CarImage } from '../../../features/cars/components/CarImage';
import { useCar, useDeleteCar, useToggleFavorite } from '../../../features/cars/hooks';
import { colors, radii, spacing, typography, TOUCH_TARGET } from '../../../theme';

export default function CarDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: car, isLoading, isError, error, refetch } = useCar(id);
  const toggleFavorite = useToggleFavorite();
  const deleteCar = useDeleteCar();

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
          <Pressable
            onPress={() => toggleFavorite.mutate({ id: car.id, isFavorite: !car.is_favorite })}
            hitSlop={spacing.sm}
            accessibilityRole="button"
            accessibilityLabel={car.is_favorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
            accessibilityState={{ selected: car.is_favorite }}
            style={styles.favorite}
          >
            <Ionicons
              name={car.is_favorite ? 'heart' : 'heart-outline'}
              size={24}
              color={car.is_favorite ? colors.red : colors.textSecondary}
            />
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <CarImage path={car.image_path} style={styles.image} iconSize={56} />

        <View style={styles.specs}>
          {specs.map((spec) => (
            <View key={spec.label} style={styles.spec}>
              <Ionicons name={spec.icon} size={18} color={colors.textMuted} />
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
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radii.lg,
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
