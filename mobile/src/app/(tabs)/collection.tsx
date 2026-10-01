import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, View } from 'react-native';
import { Fab, FAB_CLEARANCE } from '../../components/ui/Fab';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/StateViews';
import type { Car } from '../../features/cars/api';
import { CarCard } from '../../features/cars/components/CarCard';
import { useCars, useToggleFavorite } from '../../features/cars/hooks';
import { colors, spacing } from '../../theme';

export default function CollectionScreen() {
  const router = useRouter();
  const toggleFavorite = useToggleFavorite();

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
  } = useCars();

  const cars = data?.pages.flatMap((page) => page.items) ?? [];
  const total = cars.length;

  const renderItem = useCallback(
    ({ item }: { item: Car }) => (
      // La separación entre tarjetas va en una celda envolvente: FlashList no
      // admite `columnWrapperStyle` y un `ItemSeparatorComponent` en una
      // cuadricula se intercala tambien entre columnas.
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

    if (total === 0) {
      return (
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
        numColumns={2}
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
        subtitle={total > 0 ? `${total} ${total === 1 ? 'carrito' : 'carritos'}` : undefined}
      />

      <View style={styles.content}>{renderContent()}</View>

      <Fab label="Agregar carrito" onPress={() => router.push('/car/new')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  list: {
    // La mitad del margen: la otra mitad la pone cada celda, de modo que el
    // hueco entre columnas y el margen exterior queden iguales.
    paddingHorizontal: spacing.sm,
    // El FAB tapa el final de la lista; sin este hueco la ultima fila queda
    // debajo del boton y no se puede pulsar.
    paddingBottom: FAB_CLEARANCE,
  },
  cell: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.lg,
  },
  footer: {
    paddingVertical: spacing.lg,
  },
});
