# mobile — app React Native + Expo

Expo SDK 57 · React 19 · expo-router · TypeScript.

## Arrancar

```bash
cp mobile/.env.example mobile/.env
```

Rellena los dos valores de Supabase y, sobre todo, **`EXPO_PUBLIC_API_URL`**: la
dirección correcta depende de dónde ejecutes la app.

| Dónde | Valor |
|---|---|
| Emulador de Android | `http://10.0.2.2:4000` |
| Simulador de iOS | `http://localhost:4000` |
| Móvil físico con Expo Go | `http://TU_IP_LOCAL:4000` (`ipconfig`) |
| Navegador (`--web`) | `http://localhost:4000` |

`localhost` dentro de un emulador apunta al propio emulador, no a tu PC: es el
error más común al empezar.

Con la API corriendo (`npm run dev:api` en la raíz):

```bash
npm run dev:mobile
```

## Estructura

```
src/
├─ app/                  rutas de expo-router
│  ├─ _layout.tsx        providers + gate de sesión
│  ├─ (auth)/            login · register · forgot-password · reset-password
│  └─ (tabs)/            index (Inicio) · collection · more
├─ components/ui/        Button · TextField · Screen · Banner · AuthLayout · Wordmark
├─ features/
│  ├─ auth/              AuthContext · api · schemas
│  └─ profile/           api · hooks
├─ lib/                  supabase · apiClient · queryClient
├─ theme/                tokens visuales
└─ config/               env
```

## Reglas

1. Todo lo que lleve el prefijo `EXPO_PUBLIC_` acaba dentro del `.apk`/`.ipa` y
   es extraíble. **Aquí no puede haber ningún secreto.**
2. La app habla con Supabase **solo** para la identidad. Los datos van siempre
   por la API de Express (ADR-002).
3. Los tokens se guardan en `expo-secure-store` (Keychain / Keystore), nunca en
   AsyncStorage.
4. Los límites de validación se importan de `@wheel-vault/shared` para que el
   móvil y la API validen exactamente lo mismo.

## Pendiente de diseño

- La fotografía del coche del fondo en las pantallas de autenticación: falta el
  recurso, de momento hay un degradado.
- El logotipo usa la tipografía del sistema en cursiva. Lo correcto es exportar
  el original desde Figma como SVG, no buscar una fuente parecida.
- Los iconos de la app (`assets/images/`) siguen siendo los de la plantilla de
  Expo.
