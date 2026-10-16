import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { CarForm, type CarFormValues } from '../../features/cars/components/CarForm';
import { useCreateCar } from '../../features/cars/hooks';
import { useSaveCarImage } from '../../features/cars/useSaveCarImage';

export default function NewCarScreen() {
  const router = useRouter();
  const createCar = useCreateCar();
  const saveImage = useSaveCarImage();

  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(values: CarFormValues) {
    setServerError(null);
    setIsSaving(true);

    try {
      const car = await createCar.mutateAsync(values);

      if (localImageUri) {
        try {
          await saveImage(car.id, localImageUri);
        } catch {
          // El auto ya existe; que falle la foto no debe tirar todo abajo ni
          // dejar al usuario sin saber qué pasó. Se avisa y se sigue.
          setServerError(
            'El carrito se guardó, pero no se pudo subir la foto. Puedes añadirla editándolo.',
          );
          router.replace({ pathname: '/car/[id]', params: { id: car.id } });
          return;
        }
      }

      router.replace({ pathname: '/car/[id]', params: { id: car.id } });
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'No se pudo guardar el carrito');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Screen edges={['top']}>
      <ScreenHeader title="Nuevo carrito" showBack />

      <CarForm
        existingImagePath={null}
        localImageUri={localImageUri}
        onPickImage={setLocalImageUri}
        onClearImage={() => setLocalImageUri(null)}
        onSubmit={(values) => void handleSubmit(values)}
        isSubmitting={isSaving}
        submitLabel="Guardar carrito"
        serverError={serverError}
      />
    </Screen>
  );
}
