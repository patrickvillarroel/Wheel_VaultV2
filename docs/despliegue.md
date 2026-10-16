# Desplegar la API y generar el APK

Para usar la app fuera de tu red hacen falta dos cosas: la API corriendo en
internet con HTTPS, y un APK que apunte a ella.

Tiempo estimado: 30 minutos la primera vez.

---

## Por qué hace falta desplegar

La app no lleva la API dentro. Son tres piezas separadas:

```
APK (teléfono)  ──HTTPS──►  Supabase Auth      (ya está en internet)
      │
      └─────────HTTPS──────►  API Express       ← esto es lo que falta
                                   │
                                   └──────────►  Supabase / PostgreSQL
```

Con la API en tu PC, el APK solo funciona si el PC está encendido, el teléfono
está en la misma Wi-Fi y la IP no ha cambiado.

Y hay un motivo técnico que lo hace inviable igualmente: **Android bloquea el
HTTP sin cifrar en las builds de release**. Desde Android 9,
`usesCleartextTraffic` viene desactivado. En Expo Go funciona porque esa app sí
lo permite; un APK de `preview` rechazará `http://192.168.x.x:4000` sin más
explicación que un error de red.

---

## Parte 1 — La API en Render

### 1. Sube el repositorio a GitHub

Render despliega desde un repositorio. Si todavía no está subido, hazlo ahora.

Comprueba que **no haya ningún `.env` versionado**:

```bash
npm run check:secrets
```

### 2. Crea el servicio

1. Entra en <https://render.com> y conecta tu cuenta de GitHub.
2. **New → Blueprint**, elige el repositorio.
3. Render detecta `render.yaml` en la raíz y propone el servicio
   `collectors-project-api`. Acepta.

El `render.yaml` ya trae el build, el arranque, el healthcheck y la versión de
Node. No hay que tocar nada de eso.

### 3. Rellena las variables

Render te pedirá las que están marcadas como «sync: false», que son justo las
que no deben vivir en el repositorio. Son las mismas de tu `api/.env`:

| Variable | De dónde sale |
|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → Data API |
| `SUPABASE_ANON_KEY` | Supabase → Project Settings → API Keys → anon |
| `SUPABASE_JWT_SECRET` | Supabase → Project Settings → **JWT Keys** → *legacy JWT secret* |

> **Sobre `SUPABASE_JWT_SECRET`**: hace falta si tu proyecto firma los tokens
> con el secreto compartido (HS256), que es lo que usan los proyectos creados
> antes de que Supabase pasara a claves asimétricas. Si lo tienes relleno en tu
> `api/.env`, aquí también va.
>
> Si falta y el proyecto lo necesita, **todas las peticiones autenticadas
> devuelven 500** y la app queda inservible. La API lo detecta al arrancar y lo
> dice en los logs con un `FATAL`, así que no hay que deducirlo.

**`SUPABASE_SERVICE_ROLE_KEY` no se pone.** La API no la usa
([ADR-002](decisions/ADR-002-jwt-propagation.md)) y cuantos menos sitios tengan
ese secreto, mejor.

> **Si el build falla con «Could not find a declaration file for module
> 'express'»**: es que el `buildCommand` perdió el `--include=dev`. Con
> `NODE_ENV=production`, npm omite las devDependencies —donde viven TypeScript
> y los `@types`— y compilar las necesita aunque ejecutar no. Está puesto en
> `render.yaml`; si editaste el comando desde el panel de Render, ese valor
> manda sobre el del archivo.

### 4. Comprueba que arrancó

Render te da una URL del estilo `https://collectors-project-api.onrender.com`.

```bash
curl https://collectors-project-api.onrender.com/health
```

Debe responder `{"success":true,"data":{"status":"ok",...}}`.

Si falla, mira los logs en el panel de Render: el arranque valida las variables
de entorno y dice exactamente cuál falta.

### Si falla con «native WebSocket not found»

El servicio está corriendo con Node 20 o anterior. `createClient` de supabase-js
necesita el `WebSocket` global, que no existe hasta Node 22, así que la API
arranca pero revienta en cuanto llega una petición autenticada.

`render.yaml` fija `NODE_VERSION: '22'`. Si tocaste esa variable desde el panel
de Render, el valor del panel manda sobre el del archivo: corrígelo ahí.

### Si todo devuelve 500

Hay dos configuraciones que rompen la API entera y desde fuera se ven igual: no
poder verificar los tokens, y no poder hablar con Supabase. Este comando las
distingue sin necesitar credenciales:

```bash
npm run diagnose -- https://collectors-project-api.onrender.com
```

Manda un token HS256 bien formado pero firmado con una clave inventada. Si la
API responde **401**, es que pudo comprobar la firma y rechazarla: el secreto
está bien y el problema es la base de datos. Si responde **500**, ni lo intentó:
falta `SUPABASE_JWT_SECRET`.

El script dice cuál es y qué mirar.

### 5. Pásale la prueba de humo

Apunta el script a la API desplegada y vuelve a ejecutarlo. Verifica lo mismo
que en local, incluido el aislamiento entre usuarios:

```bash
API_URL=https://collectors-project-api.onrender.com npm run smoke
```

Si pasa las 41 comprobaciones, el despliegue está bien.

### El plan gratuito duerme

Render apaga los servicios del plan gratuito tras unos 15 minutos sin tráfico.
La petición que lo despierta puede tardar **30-50 segundos**.

La app lo compensa: al abrirse lanza una llamada a `/health` que no bloquea nada
(`warmUpApi` en `src/lib/apiClient.ts`). Mientras escribes tu correo y tu
contraseña, el servidor ya se está levantando.

No es infalible. Si entras y pulsas «Iniciar sesión» en dos segundos, puedes
toparte con el error de red. Vuelve a intentarlo y funcionará.

Para quitarlo de en medio: el plan de pago de Render no duerme, y Fly.io
despierta en ~1 segundo en vez de 30.

---

## Parte 2 — El APK

### 1. Instala EAS y entra

```bash
npm install -g eas-cli
```

```bash
eas login
```

### 2. Enlaza el proyecto

Desde `mobile/`:

```bash
eas init
```

Esto añade el `projectId` a `app.json`. El `eas.json` con los perfiles ya está
en el repositorio.

### 3. Configura las variables del build

Esto es lo que más confunde: **`mobile/.env` no llega a EAS**. Está en
`.gitignore`, y EAS no sube los archivos ignorados. Si no haces este paso, el
APK se construye sin configuración y revienta al arrancar.

Las tres variables se crean **una vez**, desde `mobile/`:

```bash
eas env:set preview --name EXPO_PUBLIC_API_URL --value "https://collectors-project-api.onrender.com" --visibility plaintext --scope project --non-interactive
eas env:set preview --name EXPO_PUBLIC_SUPABASE_URL --value "https://TU-PROYECTO.supabase.co" --visibility plaintext --scope project --non-interactive
eas env:set preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "TU_ANON_KEY" --visibility plaintext --scope project --non-interactive
```

Los dos valores de Supabase son los mismos de tu `mobile/.env`. El de la API
**no**: en tu `.env` apunta a tu PC, y aquí tiene que ser la URL de Render.

Comprueba que quedaron las tres:

```bash
eas env:list preview
```

> `eas env:create` está deprecado en favor de `eas env:set`. El panel de Expo
> también las deja crear, pero la opción no aparece en todas las cuentas; el
> comando funciona siempre.

> **Por qué `plaintext` y no `secret`**: las tres llevan el prefijo
> `EXPO_PUBLIC_`, así que Metro las incrusta en el bundle y acaban dentro del
> APK, de donde cualquiera puede extraerlas. Marcarlas como `secret` solo las
> escondería de ti, y además `secret` no se puede leer durante el build, que es
> cuando hacen falta. La seguridad de la anon key la dan las policies RLS, no
> el ocultarla.

### 4. Construye

```bash
eas build --platform android --profile preview
```

El perfil `preview` genera un **APK** instalable directamente. El perfil
`production` genera un AAB, que es lo que pide Google Play pero no se puede
instalar a mano.

El build tarda 10-20 minutos en los servidores de Expo. Al terminar te da un
enlace de descarga y un código QR.

### Si falla con «main module field could not be resolved»

```
While trying to resolve module `@wheel-vault/shared` ...
this package itself specifies a `main` module field that could not be
resolved (.../shared/dist/index.js)
```

`shared` es TypeScript y se publica compilado en `dist/`, que está en
`.gitignore`. EAS clona el repositorio e instala las dependencias, pero no
compila nada más, así que el paquete llega sin su `dist/` y Metro no lo
encuentra. En local no se nota porque ahí `dist/` existe desde la primera vez
que compilaste.

Lo resuelve el script `prepare` de `shared/package.json`: npm lo ejecuta solo
después de cada `npm install` y `npm ci`, también en el servidor de EAS. Si
alguna vez vuelve a aparecer este error, comprueba que ese script sigue ahí.

Se puede reproducir en local sin gastar un build:

```bash
rm -rf shared/dist && npm ci && ls shared/dist
```

### 5. Instálalo

Descarga el APK en el teléfono y ábrelo. Android pedirá permiso para instalar
desde esa fuente; es normal con un APK que no viene de Play Store.

---

## Si cambias la URL de la API

`EXPO_PUBLIC_API_URL` se incrusta en el APK al compilarlo: no es un ajuste que
se pueda cambiar luego desde el teléfono. Cambiar de servidor exige editar la
variable en el panel de Expo y **generar un APK nuevo**.

---

## Antes de que esto sea algo más que una prueba

Lo que falta está en [security.md](security.md), pero los dos que más pesan:

- **Un proyecto de Supabase separado para producción.** Ahora mismo el APK
  escribe en la misma base de datos con la que desarrollas.
- **Un proveedor SMTP propio.** El correo del plan gratuito de Supabase tiene un
  límite bajo por hora: con usuarios reales, el registro y la recuperación de
  contraseña empiezan a fallar.
