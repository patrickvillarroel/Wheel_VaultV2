import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
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
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { colors, motion, MOTION_WINDOW, spacing, typography, TOUCH_TARGET } from '../../theme';

type Sort = 'recent' | 'oldest';

/**
 * Lo que se espera desde la ultima tecla antes de consultar.
 *
 * Suficiente para que una palabra escrita del tiron salga en una sola peticion,
 * y poco para que no se perciba como lentitud al terminar de escribir.
 */
const SEARCH_DEBOUNCE_MS = 350;

export default function CollectionScreen() {
  const router = useRouter();
  const toggleFavorite = useToggleFavorite();

  const [brandId, setBrandId] = useState<string | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sort, setSort] = useState<Sort>('recent');
  const [isSearching, setIsSearching] = useState(false);
  const [search, setSearch] = useState('');

  // El campo pinta `search` y la consulta usa esto: escribir sigue siendo
  // instantaneo, pero la red solo se toca cuando hay una pausa.
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);

  const { data: brands } = useBrands();

  const filters = useMemo(
    () => ({
      brandId: brandId ?? undefined,
      search: debouncedSearch || undefined,
      // `undefined` y no `false`: así desactivarlo deja la misma clave de caché
      // que no haberlo tocado nunca, y la lista sin filtrar no se vuelve a
      // pedir al quitar el filtro.
      favorite: onlyFavorites || undefined,
      sort,
    }),
    [brandId, onlyFavorites, debouncedSearch, sort],
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
  const hasFilters = brandId !== null || onlyFavorites || search.trim().length > 0;

  // Hay quien tiene activado "reducir movimiento" porque las animaciones le
  // provocan mareo. Una lista entera entrando en cascada es justo el caso.
  const prefersReducedMotion = useReducedMotion();

  /**
   * La animación es solo para la entrada, y se apaga en cuanto termina.
   *
   * Sin esto se repetiría cada vez que una tarjeta vuelve a montarse: al
   * subir de nuevo al principio de la lista, al filtrar, o con cada letra que
   * se escribe en el buscador. Lo que debería ser un detalle de bienvenida
   * acabaría siendo un parpadeo constante.
   */
  const isEntering = useRef(true);
  const hasListAppeared = useRef(false);

  useEffect(() => {
    // Arranca cuando la lista aparece de verdad, no al montar la pantalla: los
    // datos llegan de la red y la ventana se habría agotado esperándolos.
    if (hasListAppeared.current || cars.length === 0) return;

    hasListAppeared.current = true;
    const timer = setTimeout(() => {
      isEntering.current = false;
    }, MOTION_WINDOW);

    return () => clearTimeout(timer);
  }, [cars.length]);

  function clearFilters() {
    setBrandId(null);
    setOnlyFavorites(false);
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
    // Va el segundo, justo tras "Todos": es el filtro que más se usa al
    // repasar una colección, y enterrarlo entre las marcas —que pueden ser
    // una docena— lo dejaría fuera de pantalla.
    {
      key: 'favorites',
      label: 'Favoritos',
      icon: onlyFavorites ? 'heart' : 'heart-outline',
      isActive: onlyFavorites,
      onPress: () => setOnlyFavorites((current) => !current),
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
    ({ item, index }: { item: Car; index: number }) => {
      // `isEntering` se lee en el render, no es estado: cambiarlo no tiene que
      // repintar la lista entera, solo dejar de animar lo que venga después.
      const animate = isEntering.current && !prefersReducedMotion && index < motion.count;

      return (
        <Animated.View
          style={styles.cell}
          entering={
            animate ? FadeInDown.delay(index * motion.stagger).duration(motion.duration) : undefined
          }
        >
          <CarRow
            car={item}
            onPress={() => router.push({ pathname: '/car/[id]', params: { id: item.id } })}
            onToggleFavorite={() =>
              toggleFavorite.mutate({ id: item.id, isFavorite: !item.is_favorite })
            }
          />
        </Animated.View>
      );
    },
    [router, toggleFavorite, prefersReducedMotion],
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
