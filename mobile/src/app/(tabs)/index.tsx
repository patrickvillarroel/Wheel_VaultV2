import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/ui/Screen';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/StateViews';
import { CarCard } from '../../features/cars/components/CarCard';
import { useToggleFavorite } from '../../features/cars/hooks';
import { BrandCard } from '../../features/brands/components/BrandCard';
import { useBrands } from '../../features/brands/hooks';
import { HomeHero } from '../../features/stats/components/HomeHero';
import { useSummary } from '../../features/stats/hooks';
import { colors, radii, spacing, typography } from '../../theme';

/** Ancho de las tarjetas de auto en los carruseles horizontales. */
const CAR_CARD_WIDTH = 160;

export default function HomeScreen() {
  const router = useRouter();
  const toggleFavorite = useToggleFavorite();

  const { data: summary, isLoading, isError, error, refetch, isRefetching } = useSummary();
  const { data: brands } = useBrands();

  /**
   * El carrusel muestra el catálogo entero, con las marcas que el usuario ya
   * tiene al principio.
   *
   * Filtrarlo a "solo las mías" dejaba la sección vacía mientras la colección
   * lo estuviera, justo cuando más sirve: es la forma de descubrir qué
   * fabricantes existen antes de registrar el primer carrito.
   */
  const sortedBrands = [...(brands ?? [])].sort((a, b) => b.car_count - a.car_count);

  function renderBody() {
    if (isLoading) {
      return <LoadingState />;
    }

    if (isError) {
      return (
        <ErrorState
          message={error instanceof Error ? error.message : 'No se pudo cargar tu resumen'}
          onRetry={() => void refetch()}
        />
      );
    }

    const isEmpty = !summary || summary.total_cars === 0;

    return (
      <>
        {isEmpty ? null : (
          <View style={styles.stats}>
            <StatTile
              value={summary.total_cars}
              label={summary.total_cars === 1 ? 'carrito' : 'carritos'}
            />
            <StatTile
              value={summary.total_brands}
              label={summary.total_brands === 1 ? 'marca' : 'marcas'}
            />
          </View>
        )}

        {sortedBrands.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title="Marcas" onSeeAll={() => router.push('/brands')} />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carousel}
            >
              {sortedBrands.map((brand) => (
                <BrandCard
                  key={brand.id}
                  brand={brand}
                  onPress={() =>
                    router.push({ pathname: '/brands/[id]', params: { id: brand.id } })
                  }
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {isEmpty ? (
          <View style={styles.empty}>
            <EmptyState
              illustration={require('../../../assets/images/no_inventory_load.png')}
              title="Tu colección está vacía"
              description="Agrega tu primer carrito y aquí verás tu resumen."
              actionLabel="Agregar carrito"
              onAction={() => router.push('/car/new')}
            />
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <SectionHeader
                title="Agregados recientes"
                onSeeAll={() => router.push('/collection')}
              />

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carousel}
              >
                {summary.recent.map((car) => (
                  <View key={car.id} style={styles.carCell}>
                    <CarCard
                      car={car}
                      onPress={() => router.push({ pathname: '/car/[id]', params: { id: car.id } })}
                      onToggleFavorite={() =>
                        toggleFavorite.mutate({ id: car.id, isFavorite: !car.is_favorite })
                      }
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          </>
        )}
      </>
    );
  }

  return (
    // Sin margen superior: el hero pinta por debajo de la barra de estado y
    // gestiona él mismo el espacio de la muesca.
    <Screen edges={[]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={colors.red}
            colors={[colors.red]}
            progressViewOffset={60}
          />
        }
      >
        <HomeHero onPressProfile={() => router.push('/more')} />

        {renderBody()}
      </ScrollView>
    </Screen>
  );
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.huge,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: 2,
  },
  tileValue: {
    ...typography.h1,
    color: colors.red,
  },
  tileLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  section: {
    paddingTop: spacing.xxl,
  },
  carousel: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  carCell: {
    width: CAR_CARD_WIDTH,
  },
  empty: {
    height: 420,
  },
});
