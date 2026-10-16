import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthLayout } from '../../components/ui/AuthLayout';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { signUp } from '../../features/auth/api';
import { registerSchema, type RegisterInput } from '../../features/auth/schemas';
import { colors, typography } from '../../theme';

export default function RegisterScreen() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const { needsEmailConfirmation } = await signUp(
        values.email,
        values.password,
        values.displayName,
      );

      // Con la confirmación por correo activada no hay sesión todavia, así que
      // el gate no navega a ningun sitio: hay que decirle al usuario que mire
      // su bandeja o se quedaría mirando un formulario que "no hizo nada".
      if (needsEmailConfirmation) {
        setConfirmationSent(true);
      }
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'No se pudo crear la cuenta');
    }
  });

  if (confirmationSent) {
    return (
      <AuthLayout
        title="Revisa tu correo"
        subtitle="Te enviamos un enlace para confirmar tu cuenta"
        icon="mail-outline"
      >
        <Banner
          tone="success"
          message="Abre el enlace desde este dispositivo y vuelve aquí para iniciar sesión."
        />
        <Button label="Ir a iniciar sesión" onPress={() => router.replace('/login')} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Crea tu cuenta"
      subtitle="Empieza a registrar tu colección"
      icon="person-add-outline"
      footer={
        <View style={styles.footer}>
          <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
          <Link href="/login" asChild>
            <Pressable accessibilityRole="link">
              <Text style={styles.footerLink}>Inicia sesión</Text>
            </Pressable>
          </Link>
        </View>
      }
    >
      {serverError ? <Banner tone="error" message={serverError} /> : null}

      <Controller
        control={control}
        name="displayName"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Nombre"
            icon="person-outline"
            placeholder="Nombre"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.displayName?.message}
            autoCapitalize="words"
            autoComplete="name"
            returnKeyType="next"
          />
        )}
      />

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
            returnKeyType="next"
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Contraseña"
            icon="lock-closed-outline"
            placeholder="Contraseña"
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

      <Button
        label="Crear cuenta"
        icon="arrow-forward"
        onPress={onSubmit}
        isLoading={isSubmitting}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  footerLink: {
    ...typography.caption,
    color: colors.red,
    fontWeight: '600',
  },
});
