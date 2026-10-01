import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { TextField } from '../../components/ui/TextField';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/StateViews';
import { BrandCard } from '../../features/brands/components/BrandCard';
import { useBrands } from '../../features/brands/hooks';
import { spacing } from '../../theme';

/**
 * El catálogo completo de fabricantes.
 *
 * El filtrado es local: el catálogo entero ya está en memoria y son 32 marcas,
 * así que pedir al servidor en cada tecla sería gastar red para nada.
 */
export default function BrandsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data: brands, isLoading, isError, error, refetch } = useBrands();

  const filtered = (brands ?? []).filter((brand) =>
    brand.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        title="Marcas"
        subtitle={brands ? `${brands.length} fabricantes` : undefined}
        showBack
      />

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState
          message={error instanceof Error ? error.message : 'No se pudo cargar el catálogo'}
          onRetry={() => void refetch()}
        />
      ) : (
        <>
          <View style={styles.search}>
            <TextField
              label="Buscar marca"
              icon="search-outline"
              placeholder="Buscar marca…"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(brand) => brand.id}
            numColumns={3}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <EmptyState
                icon="search-outline"
                title="Sin resultados"
                description={`Ninguna marca coincide con «${search}».`}
              />
            }
            renderItem={({ item }) => (
              <BrandCard
                brand={item}
                onPress={() => router.push({ pathname: '/brands/[id]', params: { id: item.id } })}
              />
            )}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.huge,
    gap: spacing.md,
  },
  row: {
    justifyContent: 'space-between',
  },
});
