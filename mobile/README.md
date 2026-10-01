# mobile — app React Native + Expo

Carpeta reservada. La app se genera en la **fase 3** con:

```bash
npx create-expo-app@latest mobile --template
```

## Por qué no está ya creada

Escribir a mano un `package.json` de Expo obliga a fijar versiones exactas de
`expo`, `react`, `react-native` y de una docena de paquetes `expo-*` que deben
coincidir con el SDK. Una combinación incorrecta produce un proyecto que no
compila y cuesta más desenredar que crearlo bien.

`create-expo-app` resuelve esas versiones contra el SDK actual en el momento de
ejecutarlo. Es la forma correcta y la recomendada por Expo.

## Al crearla (fase 3)

1. Generar el proyecto con Expo Router.
2. Añadir `"mobile"` al array `workspaces` del `package.json` raíz.
3. Extender `tsconfig.base.json` desde `mobile/tsconfig.json`.
4. Instalar: `@supabase/supabase-js`, `expo-secure-store`,
   `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`,
   `@shopify/flash-list`.
5. `mobile/.env` solo con `EXPO_PUBLIC_SUPABASE_URL`,
   `EXPO_PUBLIC_SUPABASE_ANON_KEY` y `EXPO_PUBLIC_API_URL`.
   **Ninguna otra clave** — todo lo que va en el bundle es público.

Estructura prevista y decisiones de UI en
[docs/architecture.md](../docs/architecture.md).
