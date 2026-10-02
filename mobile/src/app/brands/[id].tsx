import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/StateViews';
import type { Car } from '../../features/cars/api';
import { CarCard } from '../../features/cars/components/CarCard';
import { useCars, useToggleFavorite } from '../../features/cars/hooks';
import { useBrand } from '../../features/brands/hooks';
import { getBrandLogo } from '../../features/brands/logos';
import { colors, radii, spacing, typography } from '../../theme';

export default function BrandDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toggleFavorite = useToggleFavorite();

  const { data: brand, isLoading, isError, error, refetch } = useBrand(id);
  const {
    data,
    isLoading: isLoadingCars,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCars({ brandId: id });

  const cars = data?.pages.flatMap((page) => page.items) ?? [];

  const renderItem = useCallback(
    ({ item }: { item: Car }) => (
      <View style={styles.cell}>
        <CarCard
          car={item}
          onPress={() => router.push({ pathname: '/car/[id]', params: { id: item.id } })}
          onToggleFavorite={() =>
            toggleFavorite.mutate({ id: item.id, isFavorite: !item.is_favorite })
          }
        />
      </View>
    ),
    [router, toggleFavorite],
  );

  if (isLoading) {
    return (
      <Screen edges={['top']}>
        <ScreenHeader title="Marca" showBack />
        <LoadingState />
      </Screen>
    );
  }

  if (isError || !brand) {
    return (
      <Screen edges={['top']}>
        <ScreenHeader title="Marca" showBack />
        <ErrorState
          message={error instanceof Error ? error.message : 'No se encontró la marca'}
          onRetry={() => void refetch()}
        />
      </Screen>
    );
  }

  const logo = getBrandLogo(brand.slug, brand.logo_url);

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        title={brand.name}
        subtitle={`${brand.car_count} ${brand.car_count === 1 ? 'carrito' : 'carritos'} en tu colección`}
        showBack
      />

      <FlashList
        data={cars}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          brand.description || logo ? (
            <View style={styles.description}>
              {logo ? (
                <Image
                  source={logo}
                  style={styles.logo}
                  contentFit="contain"
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
              ) : null}

              {brand.description ? (
                <Text style={styles.descriptionText}>{brand.description}</Text>
              ) : null}
            </View>
          ) : null
        }
        ListEmptyComponent={
          isLoadingCars ? (
            <LoadingState />
          ) : (
            <View style={styles.empty}>
              <EmptyState
                illustration={require('../../../assets/images/no_inventory_load.png')}
                title={`Aún no tienes ${brand.name}`}
                description="Cuando agregues un carrito de esta marca aparecerá aquí."
                actionLabel="Agregar carrito"
                onAction={() => router.push('/car/new')}
              />
            </View>
          )
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            void fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.red} />
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.huge,
  },
  cell: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.lg,
  },
  description: {
    marginHorizontal: spacing.sm,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    gap: spacing.md,
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    height: 90,
  },
  descriptionText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  empty: {
    height: 420,
  },
  footer: {
    paddingVertical: spacing.lg,
  },
});
