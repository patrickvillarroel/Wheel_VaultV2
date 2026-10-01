import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthLayout } from '../../components/ui/AuthLayout';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { signIn } from '../../features/auth/api';
import { loginSchema, type LoginInput } from '../../features/auth/schemas';
import { colors, spacing, typography } from '../../theme';

export default function LoginScreen() {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await signIn(values.email, values.password);
      // No se navega a mano: al abrirse la sesión, el gate de _layout.tsx
      // lleva a (tabs). Hacerlo aquí también provocaria una doble navegación.
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'No se pudo iniciar sesión');
    }
  });

  return (
    <AuthLayout
      title="Bienvenido de vuelta"
      subtitle="Inicia sesión para continuar"
      footer={
        <View style={styles.footer}>
          <Text style={styles.footerText}>¿No tienes cuenta? </Text>
          <Link href="/register" asChild>
            <Pressable accessibilityRole="link">
              <Text style={styles.footerLink}>Crea una ahora</Text>
            </Pressable>
          </Link>
        </View>
      }
    >
      {serverError ? <Banner tone="error" message={serverError} /> : null}

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Correo electrónico"
            icon="person-outline"
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
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={onSubmit}
          />
        )}
      />

      <Link href="/forgot-password" asChild>
        <Pressable accessibilityRole="link" style={styles.forgot} hitSlop={spacing.sm}>
          <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
        </Pressable>
      </Link>

      <Button
        label="Iniciar sesión"
        icon="arrow-forward"
        onPress={onSubmit}
        isLoading={isSubmitting}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  forgot: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    ...typography.caption,
    color: colors.red,
  },
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
