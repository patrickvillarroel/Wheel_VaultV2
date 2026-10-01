import { zodResolver } from '@hookform/resolvers/zod';
import {
  CAR_LIMITS,
  createCarSchema,
  maxCarYear,
  type CreateCarFormInput,
  type CreateCarInput,
} from '@wheel-vault/shared';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Banner } from '../../../components/ui/Banner';
import { Button } from '../../../components/ui/Button';
import { QuantityStepper } from '../../../components/ui/QuantityStepper';
import { TextField } from '../../../components/ui/TextField';
import { colors, spacing, typography } from '../../../theme';
import { BrandPicker } from './BrandPicker';
import { ImageField } from './ImageField';

/** Lo que sale del formulario ya validado: es lo que espera la API. */
export type CarFormValues = CreateCarInput;

/**
 * Formulario compartido por crear y editar.
 *
 * La imagen se lleva aparte de los valores del formulario porque no es un campo
 * de la API: lo que viaja en el PATCH es la ruta del archivo ya subido, no la
 * imagen. Ver `useSaveCarImage`.
 */
export function CarForm({
  defaultValues,
  existingImagePath,
  localImageUri,
  onPickImage,
  onClearImage,
  onSubmit,
  isSubmitting,
  submitLabel,
  serverError,
}: {
  defaultValues?: Partial<CreateCarFormInput>;
  existingImagePath: string | null;
  localImageUri: string | null;
  onPickImage: (uri: string) => void;
  onClearImage: () => void;
  onSubmit: (values: CarFormValues) => void;
  isSubmitting: boolean;
  submitLabel: string;
  serverError?: string | null;
}) {
  // Los tres parámetros son la entrada del formulario, el contexto y la salida
  // validada. Sin separarlos, TypeScript no cuadra los valores por defecto
  // (donde `quantity` puede faltar) con lo que entrega el resolver.
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateCarFormInput, unknown, CarFormValues>({
    resolver: zodResolver(createCarSchema),
    defaultValues: {
      brand_id: '',
      model: '',
      vehicle_make: null,
      year: null,
      description: null,
      quantity: 1,
      is_favorite: false,
      ...defaultValues,
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {serverError ? <Banner tone="error" message={serverError} /> : null}

        <ImageField
          localUri={localImageUri}
          existingPath={existingImagePath}
          onPick={onPickImage}
          onClear={onClearImage}
        />

        <Controller
          control={control}
          name="brand_id"
          render={({ field: { onChange, value } }) => (
            <BrandPicker
              value={value || null}
              onChange={onChange}
              error={errors.brand_id?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="model"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Modelo del vehículo"
              icon="car-outline"
              placeholder="Modelo (911 GT3, Skyline GT-R…)"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.model?.message}
              autoCapitalize="words"
              returnKeyType="next"
            />
          )}
        />

        <Controller
          control={control}
          name="vehicle_make"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Marca del vehículo"
              icon="business-outline"
              placeholder="Marca del vehículo (Porsche, Nissan…)"
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.vehicle_make?.message}
              autoCapitalize="words"
              returnKeyType="next"
            />
          )}
        />

        {/* El fabricante del modelo a escala y la marca del coche real son dos
            cosas distintas y es justo donde la gente se confunde (ADR-004). */}
        <Text style={styles.hint}>
          El <Text style={styles.hintStrong}>fabricante</Text> es quien hace el modelo a escala (Hot
          Wheels). La <Text style={styles.hintStrong}>marca del vehículo</Text> es la del coche real
          (Porsche).
        </Text>

        <Controller
          control={control}
          name="year"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Año"
              icon="calendar-outline"
              placeholder={`Año (1900 - ${maxCarYear()})`}
              value={String(value ?? '')}
              // Se filtran los caracteres no numéricos en la entrada: si no,
              // `Number('abc')` da NaN y el mensaje de error no diría nada útil.
              onChangeText={(text) => {
                const digits = text.replace(/[^0-9]/g, '');
                onChange(digits === '' ? null : Number(digits));
              }}
              onBlur={onBlur}
              error={errors.year?.message}
              keyboardType="number-pad"
              maxLength={4}
              returnKeyType="next"
            />
          )}
        />

        <Controller
          control={control}
          name="quantity"
          render={({ field: { onChange, value } }) => (
            // El valor por defecto lo aplica Zod al validar, pero la entrada
            // del formulario puede llegar sin el.
            <QuantityStepper value={value ?? 1} onChange={onChange} />
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Notas"
              icon="document-text-outline"
              placeholder="Notas (edición, serie, dónde lo conseguiste…)"
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.description?.message}
              multiline
              numberOfLines={4}
              maxLength={CAR_LIMITS.description.max}
              textAlignVertical="top"
            />
          )}
        />

        <View style={styles.submit}>
          <Button label={submitLabel} onPress={handleSubmit(onSubmit)} isLoading={isSubmitting} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: -spacing.sm,
  },
  hintStrong: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  submit: {
    marginTop: spacing.sm,
  },
});
