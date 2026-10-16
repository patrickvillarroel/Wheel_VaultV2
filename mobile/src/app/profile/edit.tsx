import { zodResolver } from '@hookform/resolvers/zod';
import { updateProfileSchema, type UpdateProfileInput } from '@wheel-vault/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { KeyboardAwareScroll } from '../../components/ui/KeyboardAwareScroll';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { TextField } from '../../components/ui/TextField';
import { ErrorState, LoadingState } from '../../components/ui/StateViews';
import { useMe, useUpdateProfile } from '../../features/profile/hooks';
import { colors, spacing, typography } from '../../theme';

export default function EditProfileScreen() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useMe();
  const updateProfile = useUpdateProfile();

  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    // `values` y no `defaultValues`: el perfil llega de forma asíncrona y con
    // defaultValues el campo se quedaría vacío si la consulta aún no terminó.
    values: { display_name: data?.profile.display_name ?? '' },
  });

  const onSubmit = handleSubmit(async (input) => {
    setServerError(null);
    try {
      await updateProfile.mutateAsync(input);
      router.back();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'No se pudo guardar tu perfil');
    }
  });

  if (isLoading) {
    return (
      <Screen edges={['top']}>
        <ScreenHeader title="Editar perfil" showBack />
        <LoadingState />
      </Screen>
    );
  }

  if (isError || !data) {
    return (
      <Screen edges={['top']}>
        <ScreenHeader title="Editar perfil" showBack />
        <ErrorState
          message={error instanceof Error ? error.message : 'No se pudo cargar tu perfil'}
          onRetry={() => void refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <ScreenHeader title="Editar perfil" showBack />

      <KeyboardAwareScroll contentContainerStyle={styles.content}>
        {serverError ? <Banner tone="error" message={serverError} /> : null}

        <Controller
          control={control}
          name="display_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Nombre"
              icon="person-outline"
              placeholder="Tu nombre"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.display_name?.message}
              autoCapitalize="words"
              autoComplete="name"
              returnKeyType="go"
              onSubmitEditing={onSubmit}
            />
          )}
        />

        <View style={styles.readonly}>
          <Text style={styles.readonlyLabel}>Correo</Text>
          <Text style={styles.readonlyValue}>{data.user.email ?? '—'}</Text>
          <Text style={styles.readonlyHint}>
            Cambiar el correo requiere confirmarlo desde tu bandeja. Todavía no está disponible en
            la app.
          </Text>
        </View>

        <Button label="Guardar cambios" onPress={onSubmit} isLoading={updateProfile.isPending} />
      </KeyboardAwareScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  },
  readonly: {
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  readonlyLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  readonlyValue: {
    ...typography.body,
    color: colors.textMuted,
  },
  readonlyHint: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
