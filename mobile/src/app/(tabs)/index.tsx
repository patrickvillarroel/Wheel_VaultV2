import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { Fab, FAB_CLEARANCE } from '../../components/ui/Fab';
import { Screen } from '../../components/ui/Screen';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/StateViews';
import { CarCard } from '../../features/cars/components/CarCard';
import { BrandCard } from '../../features/brands/components/BrandCard';
import { useBrands } from '../../features/brands/hooks';
import { HomeHero } from '../../features/stats/components/HomeHero';
import { useSummary } from '../../features/stats/hooks';
import { colors, motion, spacing } from '../../theme';

/** Ancho de las tarjetas de auto en los carruseles horizontales. */
const CAR_CARD_WIDTH = 160;

/**
 * Orden de entrada de los bloques del inicio, de arriba abajo.
 *
 * Son posiciones, no milisegundos: la cadencia la pone `motion.stagger` y así
 * el inicio y la colección entran al mismo ritmo.
 */
const ORDER = {
  brands: 1,
  recent: 2,
} as const;

export default function HomeScreen() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  /**
   * No hace falta el control de "solo la primera vez" que sí lleva la
   * colección: aquí nada se recicla. Las secciones se montan cuando llegan los
   * datos y ya no se vuelven a montar —ni al tirar para refrescar, ni al
   * cambiar de pestaña y volver—, así que `entering` se dispara una sola vez.
   */
  function entrance(position: number) {
    if (prefersReducedMotion) return undefined;

    return FadeInDown.delay(position * motion.stagger).duration(motion.duration);
  }

  /**
   * Las tarjetas dentro de un carrusel solo se funden, sin desplazarse: su
   * sección ya está subiendo y dos movimientos a la vez se pelean. El escalón
   * va a la mitad porque en horizontal caben más elementos a la vista y al
   * ritmo de las secciones la última llegaría tarde.
   */
  function cardEntrance(position: number, index: number) {
    if (prefersReducedMotion || index >= motion.count) return undefined;

    const delay = position * motion.stagger + index * (motion.stagger / 2);

    return FadeIn.delay(delay).duration(motion.duration);
  }

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
        {sortedBrands.length > 0 ? (
          <Animated.View style={styles.section} entering={entrance(ORDER.brands)}>
            <SectionHeader title="Marcas" onSeeAll={() => router.push('/brands')} />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carousel}
            >
              {sortedBrands.map((brand, index) => (
                <Animated.View key={brand.id} entering={cardEntrance(ORDER.brands, index)}>
                  <BrandCard
                    brand={brand}
                    onPress={() =>
                      router.push({ pathname: '/brands/[id]', params: { id: brand.id } })
                    }
                  />
                </Animated.View>
              ))}
            </ScrollView>
          </Animated.View>
        ) : null}

        {isEmpty ? (
          <Animated.View style={styles.empty} entering={entrance(ORDER.recent)}>
            <EmptyState
              illustration={require('../../../assets/images/no_inventory_load.png')}
              title="Tu colección está vacía"
              description="Agrega tu primer carrito y aquí verás tu resumen."
              actionLabel="Agregar carrito"
              onAction={() => router.push('/car/new')}
            />
          </Animated.View>
        ) : (
          <Animated.View style={styles.section} entering={entrance(ORDER.recent)}>
            <SectionHeader
              title="Agregados recientes"
              onSeeAll={() => router.push('/collection')}
            />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carousel}
            >
              {summary.recent.map((car, index) => (
                <Animated.View
                  key={car.id}
                  style={styles.carCell}
                  entering={cardEntrance(ORDER.recent, index)}
                >
                  {/*
                      Sin corazón: el carrusel se desplaza con el dedo justo por
                      encima de las tarjetas y desmarcar un favorito aquí sería
                      un accidente silencioso. Se marca desde el detalle.
                    */}
                  <CarCard
                    car={car}
                    onPress={() => router.push({ pathname: '/car/[id]', params: { id: car.id } })}
                  />
                </Animated.View>
              ))}
            </ScrollView>
          </Animated.View>
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
        {/*
          El hero solo se funde, nunca se desplaza: va pegado a la barra de
          estado y al moverlo se vería el fondo de la pantalla por debajo.
        */}
        <Animated.View
          entering={prefersReducedMotion ? undefined : FadeIn.duration(motion.duration)}
        >
          <HomeHero onPressProfile={() => router.push('/more')} />
        </Animated.View>

        {renderBody()}
      </ScrollView>

      {/*
        Hermano del ScrollView, no hijo: dentro se iria con el contenido al
        desplazar en vez de quedarse fijo.
      */}
      <Fab label="Agregar carrito" onPress={() => router.push('/car/new')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    // Hueco para que el boton flotante no tape la ultima tarjeta del ultimo
    // carrusel: taparla la vuelve impulsable.
    paddingBottom: FAB_CLEARANCE,
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
