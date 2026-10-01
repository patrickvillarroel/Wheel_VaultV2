# ADR-001 — Supabase Auth como único proveedor de identidad

**Estado:** aceptada · 2026-09-30

## Contexto

La especificación inicial pedía a la vez JWT propios en Express (con hashing de
contraseñas) y Supabase Auth. Implementar ambos significaría duplicar
credenciales y escribir criptografía propia en la parte más delicada del
sistema.

## Opciones

**A. Auth propia en Express** (bcrypt + JWT propio + tabla `users`)

- ✅ Control total, independiente de Supabase.
- ❌ Hay que implementar y mantener: hashing, rotación y revocación de refresh
  tokens, reset por email, verificación de email, rate limiting del login,
  almacenamiento seguro en el dispositivo.
- ❌ **Rompe la RLS**: sin `auth.uid()` la base de datos no puede distinguir
  usuarios, y se pierde la segunda capa de defensa.

**B. Supabase Auth desde React Native; Express solo valida el JWT**

- ✅ El SDK gestiona access token, refresh token, rotación y persistencia.
- ✅ `auth.uid()` disponible en Postgres → RLS real.
- ✅ Reset de contraseña, verificación de email y OAuth salen de serie.
- ✅ Ninguna contraseña pasa por nuestro código.
- ❌ Dependencia de Supabase para la identidad (ya lo es para los datos).
- ❌ Tras un logout local el access token sigue válido hasta su `exp` (1 h).

## Decisión

Opción B. Los endpoints `/auth/register`, `/auth/login`, `/auth/refresh` y
`/auth/logout` **no existen** en Express: añadir endpoints espejo solo agregaría
un salto de red y superficie de ataque.

## Consecuencias

- La app móvil usa `@supabase/supabase-js` con `expo-secure-store`.
- Express verifica firma, `exp`, `iss` y `aud` en `requireAuth`.
- `profiles` no guarda email ni contraseña: viven solo en `auth.users`.
- Activar un proveedor OAuth más adelante no requiere tocar el backend.
