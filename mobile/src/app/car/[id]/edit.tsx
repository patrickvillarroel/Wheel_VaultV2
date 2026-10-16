import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Screen } from '../../../components/ui/Screen';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { ErrorState, LoadingState } from '../../../components/ui/StateViews';
import { CarForm, type CarFormValues } from '../../../features/cars/components/CarForm';
import { useCar, useUpdateCar } from '../../../features/cars/hooks';
import { useRemoveCarImage, useSaveCarImage } from '../../../features/cars/useSaveCarImage';

export default function EditCarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: car, isLoading, isError, error, refetch } = useCar(id);
  const updateCar = useUpdateCar(id);
  const saveImage = useSaveCarImage();
  const removeImage = useRemoveCarImage();

  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  /** El usuario quitó la foto que ya tenía; se borra al guardar, no antes. */
  const [imageCleared, setImageCleared] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(values: CarFormValues) {
    if (!car) return;

    setServerError(null);
    setIsSaving(true);

    try {
      await updateCar.mutateAsync(values);

      if (localImageUri) {
        await saveImage(car.id, localImageUri);
      } else if (imageCleared && car.image_path) {
        await removeImage(car.id, car.image_path);
      }

      router.back();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'No se pudo guardar el carrito');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <Screen edges={['top']}>
        <ScreenHeader title="Editar" showBack />
        <LoadingState />
      </Screen>
    );
  }

  if (isError || !car) {
    return (
      <Screen edges={['top']}>
        <ScreenHeader title="Editar" showBack />
        <ErrorState
          message={error instanceof Error ? error.message : 'No se encontró el carrito'}
          onRetry={() => void refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <ScreenHeader title="Editar carrito" showBack />

      <CarForm
        defaultValues={{
          brand_id: car.brand?.id ?? '',
          model: car.model,
          vehicle_make: car.vehicle_make,
          year: car.year,
          description: car.description,
          quantity: car.quantity,
          is_favorite: car.is_favorite,
        }}
        existingImagePath={imageCleared ? null : car.image_path}
        localImageUri={localImageUri}
        onPickImage={(uri) => {
          setLocalImageUri(uri);
          setImageCleared(false);
        }}
        onClearImage={() => {
          setLocalImageUri(null);
          setImageCleared(true);
        }}
        onSubmit={(values) => void handleSubmit(values)}
        isSubmitting={isSaving}
        submitLabel="Guardar cambios"
        serverError={serverError}
      />
    </Screen>
  );
}
