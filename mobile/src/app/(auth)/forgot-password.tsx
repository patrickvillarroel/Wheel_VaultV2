import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { AuthLayout } from '../../components/ui/AuthLayout';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { requestPasswordReset } from '../../features/auth/api';
import { forgotPasswordSchema, type ForgotPasswordInput } from '../../features/auth/schemas';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await requestPasswordReset(values.email);
      setSent(true);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'No se pudo enviar el correo');
    }
  });

  return (
    <AuthLayout
      title="Recuperar contraseña"
      subtitle={
        sent
          ? 'Si ese correo está registrado, recibirás un enlace'
          : 'Te enviaremos un enlace para crear una nueva'
      }
      icon="key-outline"
    >
      {serverError ? <Banner tone="error" message={serverError} /> : null}

      {sent ? (
        <>
          {/*
            El mensaje no confirma si el correo existe o no. Decir "ese correo no
            esta registrado" permitiría averiguar quien tiene cuenta.
          */}
          <Banner
            tone="success"
            message="Revisa tu bandeja de entrada y la carpeta de spam. El enlace caduca en una hora."
          />
          <Button label="Volver a iniciar sesión" onPress={() => router.replace('/login')} />
        </>
      ) : (
        <>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label="Correo electrónico"
                icon="mail-outline"
                placeholder="Correo electrónico"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="go"
                onSubmitEditing={onSubmit}
              />
            )}
          />

          <Button label="Enviar enlace" onPress={onSubmit} isLoading={isSubmitting} />
          <Button label="Volver" variant="ghost" onPress={() => router.back()} />
        </>
      )}
    </AuthLayout>
  );
}
