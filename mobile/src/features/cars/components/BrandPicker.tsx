import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../../components/ui/Screen';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { TextField } from '../../../components/ui/TextField';
import { ErrorState, LoadingState } from '../../../components/ui/StateViews';
import { useBrands } from '../../brands/hooks';
import { colors, radii, spacing, typography, TOUCH_TARGET } from '../../../theme';

/**
 * Selector de fabricante.
 *
 * El catálogo tiene 32 marcas, demasiadas para una lista desplegable corta y
 * pocas para paginar, así que se abre a pantalla completa con un buscador.
 * El filtrado es local: el catálogo entero ya está en memoria y pedir al
 * servidor en cada tecla sería gastar red para nada.
 */
export function BrandPicker({
  value,
  onChange,
  error,
}: {
  value: string | null;
  onChange: (brandId: string) => void;
  error?: string | undefined;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: brands, isLoading, isError, refetch } = useBrands();

  const selected = brands?.find((brand) => brand.id === value) ?? null;

  const filtered =
    brands?.filter((brand) => brand.name.toLowerCase().includes(search.trim().toLowerCase())) ?? [];

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={() => setIsOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={
          selected ? `Fabricante: ${selected.name}. Cambiar` : 'Seleccionar fabricante'
        }
        style={({ pressed }) => [
          styles.trigger,
          Boolean(error) && styles.triggerError,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons
          name="pricetag-outline"
          size={20}
          color={error ? colors.danger : colors.textMuted}
        />

        <Text style={[styles.triggerText, !selected && styles.placeholder]} numberOfLines={1}>
          {selected ? selected.name : 'Fabricante (Hot Wheels, Maisto…)'}
        </Text>

        <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsOpen(false)}
      >
        <Screen>
          <ScreenHeader
            title="Fabricante"
            right={
              <Pressable
                onPress={() => setIsOpen(false)}
                hitSlop={spacing.md}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
              >
                <Ionicons name="close" size={26} color={colors.textPrimary} />
              </Pressable>
            }
          />

          <View style={styles.search}>
            <TextField
              label="Buscar fabricante"
              icon="search-outline"
              placeholder="Buscar…"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {isLoading ? (
            <LoadingState />
          ) : isError ? (
            <ErrorState message="No se pudo cargar el catálogo" onRetry={() => void refetch()} />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(brand) => brand.id}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={styles.empty}>Ninguna marca coincide con «{search}»</Text>
              }
              renderItem={({ item }) => {
                const isSelected = item.id === value;

                return (
                  <Pressable
                    onPress={() => {
                      onChange(item.id);
                      setSearch('');
                      setIsOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    style={({ pressed }) => [
                      styles.option,
                      isSelected && styles.optionSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.optionText}>
                      <Text style={styles.optionName}>{item.name}</Text>
                      {item.car_count > 0 ? (
                        <Text style={styles.optionCount}>{item.car_count} en tu colección</Text>
                      ) : null}
                    </View>

                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={22} color={colors.red} />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          )}
        </Screen>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: TOUCH_TARGET + 8,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
  },
  triggerError: {
    borderColor: colors.danger,
  },
  triggerText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  placeholder: {
    color: colors.textMuted,
  },
  pressed: {
    opacity: 0.75,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    paddingHorizontal: spacing.xs,
  },
  search: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.huge,
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: TOUCH_TARGET + 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
  },
  optionSelected: {
    borderColor: colors.red,
    backgroundColor: colors.redSoft,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionName: {
    ...typography.body,
    color: colors.textPrimary,
  },
  optionCount: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  empty: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.huge,
  },
});
