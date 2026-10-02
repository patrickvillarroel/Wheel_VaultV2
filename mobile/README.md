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

## Escanear el blister

Al añadir la foto de un carrito hay tres orígenes: **escanear**, cámara y
galería. El escáner usa el detector de documentos del sistema —VisionKit en iOS,
Document Scanner de ML Kit en Android— porque un blister es un rectángulo de
cartón sobre una mesa, que es justo el problema que esos SDK ya resuelven:
detectan los bordes, corrigen la perspectiva y devuelven el cartón recortado.

Es **una opción, no el camino único**. Muchos carritos están fuera del blister y
esos entran por cámara o galería como siempre.

### Necesita una build de desarrollo

`react-native-document-scanner-plugin` es un módulo nativo, así que **no está en
el binario de Expo Go**. La app sigue arrancando en Expo Go: el módulo se carga
con un `import()` dinámico dentro de
[`scanBlister.ts`](src/features/cars/scanBlister.ts), no al cargar la pantalla,
y si no está, el escáner avisa de que no está disponible en vez de reventar. Lo
único que no funciona ahí es escanear.

Para probarlo de verdad hay que compilar:

```bash
npx expo run:android
```

O, si no tienes el SDK de Android instalado, con EAS (el perfil `development` de
`eas.json` ya tiene `developmentClient: true`):

```bash
eas build --profile development --platform android
```

Después, `npm run dev:mobile` y abrir el proyecto desde esa app en vez de desde
Expo Go. Mientras no cambien las dependencias nativas no hay que recompilar: el
JavaScript se sigue recargando igual.

Con `expo-dev-client` instalado, Metro arranca apuntando a la build de
desarrollo. Para volver a Expo Go se pulsa **`s`** en la terminal de Metro, que
cambia entre los dos modos.

> En Android el escáner lo sirve Google Play Services. Un emulador sin Play
> Store o un móvil sin servicios de Google no lo tiene, y la app cae al aviso de
> "escáner no disponible".

## Generar un APK

La app no lleva la API dentro: para usarla fuera de tu red hay que desplegarla y
apuntar el APK a esa URL. Está explicado paso a paso en
[docs/despliegue.md](../docs/despliegue.md).

Un detalle que no es evidente: **`mobile/.env` no llega a EAS**. Está en
`.gitignore` y EAS no sube los archivos ignorados, así que las variables
`EXPO_PUBLIC_*` hay que declararlas en el panel de Expo. Si se olvida, el APK se
construye sin configuración y falla al arrancar.

## Logotipos de las marcas

Van en **`mobile/assets/images/brands/<slug>.png`**, con el mismo slug que la
marca tiene en la base de datos (`hot-wheels.png`, `mini-gt.png`…). Los slugs
están en la migración `supabase/migrations/20260930120200_brands.sql` y los
devuelve `GET /api/v1/brands`.

Después hay que añadir su línea en
[`src/features/brands/logos.ts`](src/features/brands/logos.ts). Ese segundo paso
no se puede evitar: Metro resuelve los `require()` en tiempo de compilación para
poder empaquetar el archivo, así que una ruta construida al vuelo no funciona.

PNG con fondo transparente, unos 300 px de ancho. La app tiene fondo negro, así
que conviene la versión clara del logotipo cuando exista.

Una marca sin logotipo muestra su nombre en texto: el catálogo sigue siendo
usable mientras se completan las imágenes.

> `brands.logo_url` existe en la base de datos y **tiene prioridad** sobre el
> archivo incluido en la app. Es la vía para las marcas que cree un usuario
> ([ADR-003](../docs/decisions/ADR-003-brands-ownership.md)), que sí vivirían en
> Storage.

## Si el typecheck falla con rutas

`expo-router` genera los tipos de las rutas en `.expo/types/router.d.ts`, y solo
los regenera **cuando arranca Metro**. Si añades, renombras o borras una
pantalla con Metro parado, el archivo queda desfasado y `npm run typecheck`
protesta por rutas que sí existen, con un mensaje que no da ninguna pista:

```
Type '"/car/[id]"' is not assignable to type 'RelativePathString | ...'
```

Es una caché, no una fuente de verdad. Se borra y listo:

```bash
npm run clean:routes --workspace=mobile
```

Sin ese archivo el typecheck pasa igual, solo que sin comprobar las rutas; la
siguiente vez que arranques `npm run dev:mobile` se regenera correcto.

## Pendiente de diseño

- La fotografía del coche del fondo en las pantallas de autenticación: falta el
  recurso, de momento hay un degradado.
- El logotipo usa la tipografía del sistema en cursiva. Lo correcto es exportar
  el original desde Figma como SVG, no buscar una fuente parecida.
- Los iconos de la app (`assets/images/`) siguen siendo los de la plantilla de
  Expo.
