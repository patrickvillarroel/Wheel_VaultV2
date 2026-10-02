import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Fab, FAB_CLEARANCE } from '../../components/ui/Fab';
import { FilterChips, type Chip } from '../../components/ui/FilterChips';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { TextField } from '../../components/ui/TextField';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/StateViews';
import type { Car } from '../../features/cars/api';
import { CarRow } from '../../features/cars/components/CarRow';
import { useCars, useToggleFavorite } from '../../features/cars/hooks';
import { useBrands } from '../../features/brands/hooks';
import { colors, spacing, typography, TOUCH_TARGET } from '../../theme';

type Sort = 'recent' | 'oldest';

export default function CollectionScreen() {
  const router = useRouter();
  const toggleFavorite = useToggleFavorite();

  const [brandId, setBrandId] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>('recent');
  const [isSearching, setIsSearching] = useState(false);
  const [search, setSearch] = useState('');

  const { data: brands } = useBrands();

  const filters = useMemo(
    () => ({
      brandId: brandId ?? undefined,
      search: search.trim() || undefined,
      sort,
    }),
    [brandId, search, sort],
  );

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCars(filters);

  const cars = data?.pages.flatMap((page) => page.items) ?? [];

  // Los totales solo viajan en la primera página; las siguientes traen `null`.
  const totals = data?.pages[0];
  const hasFilters = brandId !== null || search.trim().length > 0;

  function clearFilters() {
    setBrandId(null);
    setSearch('');
    setIsSearching(false);
  }

  const chips: Chip[] = [
    {
      key: 'all',
      label: 'Todos',
      icon: 'grid-outline',
      isActive: !hasFilters,
      onPress: clearFilters,
    },
    {
      key: 'search',
      label: 'Buscar',
      icon: 'search-outline',
      isActive: isSearching || search.length > 0,
      onPress: () => {
        setIsSearching((open) => !open);
        if (isSearching) setSearch('');
      },
    },
    {
      key: 'sort',
      label: sort === 'recent' ? 'Recientes' : 'Antiguos',
      icon: 'time-outline',
      isActive: sort === 'oldest',
      onPress: () => setSort((current) => (current === 'recent' ? 'oldest' : 'recent')),
    },
    // Solo las marcas de las que el usuario tiene algo: filtrar por una marca
    // sin carritos siempre daría una lista vacía.
    ...(brands ?? [])
      .filter((brand) => brand.car_count > 0)
      .map((brand) => ({
        key: brand.id,
        label: brand.name,
        isActive: brandId === brand.id,
        onPress: () => setBrandId((current) => (current === brand.id ? null : brand.id)),
      })),
  ];

  const renderItem = useCallback(
    ({ item }: { item: Car }) => (
      <View style={styles.cell}>
        <CarRow
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

  function renderContent() {
    if (isLoading) {
      return <LoadingState label="Cargando tu colección…" />;
    }

    if (isError) {
      return (
        <ErrorState
          message={error instanceof Error ? error.message : 'No se pudo cargar tu colección'}
          onRetry={() => void refetch()}
        />
      );
    }

    if (cars.length === 0) {
      // Con filtros activos, una lista vacía no significa lo mismo que una
      // colección vacía: ofrecer "agregar carrito" ahí sería desorientador.
      return hasFilters ? (
        <EmptyState
          icon="search-outline"
          title="Sin resultados"
          description="Ningún carrito coincide con este filtro."
          actionLabel="Quitar filtros"
          onAction={clearFilters}
        />
      ) : (
        <EmptyState
          illustration={require('../../../assets/images/no_inventory_load.png')}
          title="Tu colección está vacía"
          description="Agrega tu primer carrito para comenzar."
          actionLabel="Agregar carrito"
          onAction={() => router.push('/car/new')}
        />
      );
    }

    return (
      <FlashList
        data={cars}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={colors.red}
            colors={[colors.red]}
          />
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
    );
  }

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        title="Colección"
        right={
          hasFilters ? (
            <Pressable
              onPress={clearFilters}
              hitSlop={spacing.sm}
              accessibilityRole="button"
              accessibilityLabel="Quitar los filtros y ver todos"
              style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}
            >
              <Text style={styles.seeAllText}>Ver todos</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.red} />
            </Pressable>
          ) : null
        }
      />

      <FilterChips chips={chips} />

      {isSearching ? (
        <View style={styles.search}>
          <TextField
            label="Buscar en tu colección"
            icon="search-outline"
            placeholder="Buscar por modelo…"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            returnKeyType="search"
          />
        </View>
      ) : null}

      <View style={styles.header}>
        {totals?.totalModels !== null && totals?.totalModels !== undefined ? (
          <View style={styles.counts}>
            <Ionicons name="car-sport" size={16} color={colors.red} />
            <Text style={styles.countsText}>
              {totals.totalModels} {totals.totalModels === 1 ? 'modelo' : 'modelos'}
              {totals.totalUnits !== null ? (
                <Text>
                  {'  ·  '}
                  {totals.totalUnits} {totals.totalUnits === 1 ? 'unidad' : 'unidades'}
                </Text>
              ) : null}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.content}>{renderContent()}</View>

      <Fab label="Agregar carrito" onPress={() => router.push('/car/new')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: TOUCH_TARGET - 16,
  },
  seeAllText: {
    ...typography.caption,
    color: colors.red,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.6,
  },
  counts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  countsText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: FAB_CLEARANCE,
  },
  cell: {
    paddingBottom: spacing.md,
  },
  footer: {
    paddingVertical: spacing.lg,
  },
});
