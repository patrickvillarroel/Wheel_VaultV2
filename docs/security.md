# Seguridad

## Principios

1. **Defensa en profundidad.** Cada dato se protege dos veces: en la API y en la
   base de datos. Un bug en una capa no basta para filtrar datos.
2. **Mínimo privilegio.** El rol `anon` no toca ninguna tabla. `service_role`
   solo se usa en scripts administrativos, nunca en un request de usuario.
3. **Nada de criptografía propia.** Contraseñas y tokens los gestiona Supabase
   Auth (ADR-001).
4. **El cliente no es de fiar.** Toda entrada se valida en el servidor, aunque
   ya se haya validado en el móvil.

## Controles por capa

| Capa | Control |
|---|---|
| Transporte | HTTPS obligatorio. Tokens en `expo-secure-store` (Keychain / Keystore), **no** en AsyncStorage |
| Autenticación | JWT de Supabase verificado en Express: firma, `exp`, `iss`, `aud`. Nunca `jwt.decode()` sin verificar |
| Autorización | `requireAuth` inyecta `req.user.id`. Los services **nunca** aceptan `user_id` desde el body o la query |
| Validación | Zod en body, params y query. Límites compartidos con el móvil vía `shared/` |
| Inyección SQL | Siempre cliente Supabase / consultas parametrizadas. Cero concatenación de SQL |
| XSS | React Native no renderiza HTML; aun así se limita la longitud del texto libre |
| CSRF | No aplica: API stateless con Bearer token, sin cookies |
| Rate limiting | Global 100 req / 15 min por IP; escrituras 30 / 15 min. El login lo limita Supabase |
| Headers | `helmet` con los defaults + HSTS |
| CORS | Allowlist explícita desde `CORS_ORIGINS`. Nunca `*` |
| Secretos | `.env` fuera de Git; `.env.example` versionado sin valores |
| Errores | Envelope estándar; stack traces y errores de Postgres solo a los logs |
| Logs | Pino con redacción de `authorization`, `password` y `email` |
| Base de datos | RLS en las tres tablas + `REVOKE ALL FROM anon` |
| Storage | Bucket privado, policies por carpeta `<user_id>/`, URLs firmadas de corta duración. La ruta la valida el servidor, no se acepta la del cliente ([ADR-007](decisions/ADR-007-storage-directo.md)) |

## Qué puede y qué no puede estar en la app móvil

| Valor | ¿En el bundle móvil? |
|---|---|
| `SUPABASE_URL` | ✅ Pública |
| `SUPABASE_ANON_KEY` | ✅ Pública **por diseño** — su seguridad depende por completo de las policies RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | 🔴 **Nunca.** Ignora toda la RLS |
| `SUPABASE_JWT_SECRET` | 🔴 **Nunca.** Permite fabricar tokens válidos |
| Credenciales de Postgres | 🔴 **Nunca** |

Cualquier valor dentro de un `.apk` o `.ipa` es extraíble. Si está ahí, es
público.

## Autenticación: flujo

**Registro**

```
app → supabase.auth.signUp({ email, password, data: { display_name } })
      → GoTrue crea auth.users (contraseña cifrada; nuestro código nunca la ve)
      → trigger handle_new_user() crea el perfil
      → email de confirmación
```

**Sesión**

```
app → signInWithPassword() → { access_token (1 h), refresh_token }
      el SDK los persiste en expo-secure-store y rota el refresh solo

cada request a Express:
      interceptor → getSession() (refresca solo si va a expirar)
                  → Authorization: Bearer <access_token>
Express requireAuth → verifica → req.user = { id, email }
```

**Token expirado**

```
Express responde 401 AUTH_TOKEN_EXPIRED
  → el cliente intenta refreshSession() UNA vez
      ├ ok    → reintenta el request original
      └ falla → signOut local + redirect a (auth)/login + limpieza del cache
```

**Logout**: `signOut({ scope: 'local' })` + purga del cache de TanStack Query.

### Verificación del token en Express

Se verifica **localmente** la firma (`api/src/config/jwt.ts`), no con
`supabase.auth.getUser(token)`. Esa alternativa es autoritativa — detecta
sesiones revocadas al instante — pero añade una llamada de red en **cada**
request y consume el rate limit del servicio de auth.

Además de la firma se comprueban `exp`, `iss` y `aud`. El `issuer` no es
opcional: sin él, un token perfectamente válido emitido por **otro proyecto de
Supabase** sería aceptado por el nuestro.

Se soportan los dos esquemas de firma: claves asimétricas vía JWKS (lo que usan
los proyectos nuevos) y el secreto compartido HS256 heredado. Así el proyecto
funciona sin importar cuándo se creó, y migrar a asimétricas no rompe nada.

> Limitación conocida y aceptada: tras un logout local, el access token sigue
> siendo criptográficamente válido hasta su `exp` (1 h). Para invalidarlo de
> inmediato en todos los dispositivos hace falta `scope: 'global'`. Se evalúa en
> la fase 10.

## Autorización

Todo recurso de usuario se filtra por `user_id` **dos veces**:

1. El repository añade siempre el filtro, con `req.user.id` como única fuente.
2. La RLS lo impone en la base de datos.

Un recurso que existe pero no es tuyo responde **404**, no 403: un 403 confirma
que el id existe y filtra información.

## Qué se prueba (y debe seguir pasando)

| Prueba | Dónde | Fase |
|---|---|---|
| A no puede leer / modificar / borrar los autos de B | `supabase/tests/rls_isolation.sql` | ✅ 1 |
| A no puede crear ni reasignar un auto a nombre de B | mismo archivo | ✅ 1 |
| El catálogo global de marcas es de solo lectura | mismo archivo | ✅ 1 |
| B no puede leer el perfil de A | mismo archivo | ✅ 1 |
| `requireAuth`: sin token, mal formado, basura, firmado con otra clave, caducado | `api/tests/app.test.ts` | ✅ 2 |
| JWT: issuer de otro proyecto, audiencia distinta, sin `sub`, motivo interno no filtrado | `api/tests/jwt.test.ts` | ✅ 2 |
| Zod descarta campos no declarados (p. ej. un `user_id` inyectado en el body) | `api/tests/validate.test.ts` | ✅ 2 |
| El `user_id` de toda operación sobre `cars` sale del token, nunca del body ni de la query | `api/tests/cars.api.test.ts` | ✅ 5 |
| Las 5 rutas de `/cars` exigen token | `api/tests/cars.api.test.ts` | ✅ 5 |
| Un auto ajeno responde 404, no 403 (un 403 confirmaría que el id existe) | `api/tests/cars.api.test.ts` | ✅ 5 |
| No se puede asignar un auto a un fabricante privado de otro usuario | `api/tests/cars.api.test.ts` | ✅ 5 |
| Un cursor manipulado da 422 y no llega a consultar | `api/tests/pagination.test.ts` | ✅ 5 |
| Zod: cantidad < 1, año inválido, texto fuera de límite, UUID malformado | `api/tests/cars.schema.test.ts` | ✅ 5 |
| El catálogo de marcas exige token y no expone `created_by` | `api/tests/brands.api.test.ts` | ✅ 7 |
| Los autos de una marca siguen acotados por el `user_id` del token | `api/tests/brands.api.test.ts` | ✅ 7 |
| El `car_count` de cada marca cuenta solo los autos del usuario | manual, [probar-la-api.md](probar-la-api.md) paso 6 | 7 |
| `image_path` apuntando a la carpeta de otro usuario, o a otro auto, da 422 | `api/tests/cars.api.test.ts` | ✅ 5.5 |
| Mismos casos de aislamiento contra una base de datos real, vía HTTP | pendiente | 10 |

`rls_isolation.sql` se vuelve a ejecutar **cada vez que se toca una policy**.

## Vulnerabilidades aceptadas (y por qué)

`npm audit` reporta **14 moderadas**, todas transitivas del propio toolchain de
Expo. `npm audit fix --force` las "arregla" degradando `expo-router` a una
versión incompatible con el SDK 57, es decir, rompiendo el proyecto. No se hace.

| Cadena | Dónde vive | Riesgo real |
|---|---|---|
| `decode-uri-component` ← `query-string` ← `expo-router` | En la app | DoS al parsear un deep link malformado. Afecta a la app del propio usuario, no al servidor |
| `uuid` ← `xcode` ← `@expo/config-plugins` | Solo build (`prebuild` de iOS) | No viaja en el bundle |

Se revisa cuando Expo publique una versión que suba esas dependencias. Anotado
en la lista de la fase 10.

`api/` y `shared/` están en **0 vulnerabilidades**.

## Pendientes antes de producción (fase 10)

- [ ] Proveedor SMTP propio: el correo del plan Free es solo para pruebas
- [ ] `npm audit` y revisión de dependencias
- [ ] Escaneo de secretos (gitleaks) en CI
- [ ] Proyecto Supabase separado para producción, con claves distintas
- [ ] Revisar `scope: 'global'` en el logout
- [ ] Rate limiting por usuario además de por IP
- [ ] Revisar las 14 vulnerabilidades transitivas de Expo cuando el SDK las suba
- [ ] Repaso de los mensajes de error visibles al usuario
