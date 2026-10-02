import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { AuthLayout } from '../../components/ui/AuthLayout';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { signOut, updatePassword } from '../../features/auth/api';
import { resetPasswordSchema, type ResetPasswordInput } from '../../features/auth/schemas';
import { useAuth } from '../../features/auth/AuthContext';

/**
 * Pantalla a la que lleva el enlace del correo de recuperación.
 *
 * Al llegar aquí ya hay sesión: la instala `useAuthDeepLink` con los tokens
 * que trae el propio enlace, antes de que el splash se retire. Por eso esta
 * ruta esta exenta del gate en _layout.tsx —es la unica del grupo (auth) a la
 * que se entra autenticado—.
 *
 * Sin sesión no hay nada que cambiar: el enlace caducó, ya se usó, o se llegó
 * aquí por otro camino.
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await updatePassword(values.password);

      // Se cierra la sesión a proposito: obliga a entrar con la contraseña
      // nueva, que confirma que el cambio funciono y que el usuario la recuerda.
      await signOut();
      router.replace('/login');
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'No se pudo cambiar la contraseña');
    }
  });

  if (!isAuthenticated) {
    return (
      <AuthLayout
        title="Enlace no válido"
        subtitle="Este enlace ha caducado o ya se usó"
        icon="alert-circle-outline"
      >
        <Banner
          tone="error"
          message="Pide un enlace nuevo desde la pantalla de recuperar contraseña."
        />
        <Button label="Pedir otro enlace" onPress={() => router.replace('/forgot-password')} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Nueva contraseña"
      subtitle="Elige una contraseña para tu cuenta"
      icon="key-outline"
    >
      {serverError ? <Banner tone="error" message={serverError} /> : null}

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Nueva contraseña"
            icon="lock-closed-outline"
            placeholder="Nueva contraseña"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.password?.message}
            isPassword
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
          />
        )}
      />

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Repite la contraseña"
            icon="lock-closed-outline"
            placeholder="Repite la contraseña"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.confirmPassword?.message}
            isPassword
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={onSubmit}
          />
        )}
      />

      <Button label="Guardar contraseña" onPress={onSubmit} isLoading={isSubmitting} />
    </AuthLayout>
  );
}
