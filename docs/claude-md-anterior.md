# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Contexto

Monorepo pnpm que digitaliza cartas de restaurantes y las publica bajo un QR fijo. API NestJS + Next.js App Router + PostgreSQL vía Prisma. Fases 0–7 implementadas (ver [README.md](README.md) para el contrato funcional de cada fase y la lista completa de endpoints).

## Comandos

Todo se ejecuta desde la raíz. `pnpm@11.1.1` y Node ≥24 son obligatorios.

```powershell
pnpm dev                 # api (tsx watch) + web (next dev) en paralelo
pnpm build               # db:generate + build recursivo, concurrencia 1
pnpm lint                # eslint en cada workspace
pnpm typecheck           # db:generate + tsc por workspace
pnpm test                # db:generate + jest por workspace
pnpm check:dead-code     # knip (archivos, deps, exports, tipos)
pnpm test:e2e            # playwright; requiere el stack levantado
```

Los scripts raíz de `typecheck`/`test`/`build` invocan `prisma generate` primero porque `apps/api/src/generated/prisma/` está gitignoreado y no existe en un clon limpio.

### Base de datos

```powershell
pnpm db:generate         # regenera el cliente en apps/api/src/generated/prisma
pnpm db:validate
pnpm db:migrate          # migración de desarrollo
pnpm db:deploy           # aplica migraciones (lo hace también compose.yml al arrancar)
pnpm db:studio
pnpm seed:admin          # bootstrap idempotente del administrador inicial
```

### Docker

```powershell
pnpm compose:dev         # compose.yml + compose.dev.yml, publica puertos en loopback
pnpm compose:dev:down    # detiene sin borrar volúmenes
pnpm compose:up          # producción/Dokploy (solo compose.yml, sin puertos publicados)
pnpm compose:config      # valida la interpolación de .env
```

Nunca uses `docker compose down --volumes`: destruye `postgres_data` y `uploads_data`.

### Un solo test

```powershell
pnpm --filter @sirio/api exec jest src/auth/application/auth.service.spec.ts
pnpm --filter @sirio/api exec jest -t "revoca las sesiones"
pnpm --filter @sirio/web exec jest src/app/admin/qr/qr-manager.test.tsx
pnpm exec playwright test tests/e2e/phase-one-auth.spec.ts
pnpm exec playwright test -g "la API responde su health check"
```

`packages/shared` necesita su flag ESM: `pnpm --filter @sirio/shared test`.

La suite Playwright corre en serie (`workers: 1`, `fullyParallel: false`) contra el stack real; las specs apuntan a `E2E_WEB_URL`/`E2E_HEALTH_URL` (por defecto `127.0.0.1:3000` y `:3001`). Levanta `pnpm compose:dev` antes.

## Arquitectura

### Frontera de red

El navegador **nunca** habla con NestJS directamente. La cadena es:

```
navegador → Next.js (BFF) → api-internal:3001 (NestJS) → postgres-internal:5432
```

- `apps/web/src/app/api/**/route.ts` son Route Handlers que actúan de BFF. Cada mutación llama a `isSameOrigin(request)` y devuelve 403 si falla; luego reenvía con `authenticatedApiFetch(path, init, rol)` y devuelve `proxyApiResponse(upstream)`.
- Los JWT viven en cookies `HttpOnly`/`SameSite=Strict` (`sirio_access`, `sirio_refresh`, `sirio_role`) gestionadas en [apps/web/src/lib/api-server.ts](apps/web/src/lib/api-server.ts). `authenticatedApiFetch` renueva contra `/api/auth/refresh` ante un 401, verifica que el rol devuelto coincida con el requerido y reintenta una sola vez.
- `hasSessionCookieForRole` es solo una pista de render en servidor; la autorización real siempre la hace el Route Handler o el guard de Nest.
- `next.config.ts` reescribe únicamente `/api/health*` y `/api/auth/*` hacia la API. Todo lo demás pasa por un Route Handler explícito.
- En Compose la web resuelve la API por el alias `api-internal`; `API_INTERNAL_URL` solo aplica en desarrollo nativo.

Al añadir un endpoint de Nest hace falta también su Route Handler espejo en `apps/web/src/app/api/...`, con la misma validación de origen y el rol correcto (`'OWNER'` o `'ADMIN'`).

### Módulos de la API (arquitectura hexagonal)

`apps/api/src/<módulo>/` con `auth`, `restaurants`, `digitization`, `menu-management`, `analytics`, `health`. Cada módulo de dominio sigue la misma partición:

- `domain/` — tipos, errores y reglas puras, sin dependencias de Nest ni Prisma.
- `application/ports/` — interfaces (repositorios, gateways, storage).
- `application/use-cases/` — clases planas **sin decoradores**, con las dependencias por constructor.
- `infrastructure/` — adaptadores Prisma, filesystem, Gemini, `qrcode`.
- `presentation/` — DTOs `class-validator`, guards, mapeo de errores de dominio a HTTP.
- `<módulo>.tokens.ts` — `Symbol(...)` para cada puerto y cada caso de uso.

El módulo cablea todo con `useFactory` + `inject` sobre esos símbolos (ver [apps/api/src/restaurants/restaurants.module.ts](apps/api/src/restaurants/restaurants.module.ts)). No uses `@Injectable()` en casos de uso ni inyección por tipo de clase: rompe el patrón y hace que los tests unitarios necesiten el contenedor de Nest.

El mismo adaptador Prisma puede registrarse bajo varios tokens (`RESTAURANT_REPOSITORY`, `RESTAURANT_PROFILE_REPOSITORY`, `RESTAURANT_QR_REPOSITORY` apuntan a `PrismaRestaurantRepository`) para que cada caso de uso dependa solo del puerto estrecho que necesita.

### Autorización

Todo es privado por defecto. `AccessTokenGuard` + `RolesGuard` se aplican globalmente; se abre una ruta con `@Public()` y se restringe con `@Roles(AuthRole.OWNER)`. Cualquier ruta con `:restaurantId` añade `@UseGuards(OwnerRestaurantGuard)`, que verifica la pertenencia del dueño al restaurante en `RestaurantOwner` — es la defensa contra IDOR y tiene cobertura E2E en [tests/e2e/security-session-idor.spec.ts](tests/e2e/security-session-idor.spec.ts).

Contraseñas con Argon2id. Cambiar o resetear una contraseña revoca todas las sesiones de esa cuenta. El refresh token rota: reutilizar uno viejo revoca la sesión.

### Configuración

`validateEnvironment` en [apps/api/src/config/environment.ts](apps/api/src/config/environment.ts) valida y normaliza todo el entorno al arrancar (formatos de secretos, orígenes HTTP, duraciones tipo `15m`, rangos de Gemini). Añadir una variable implica extender `Environment`, su parser y el `.env.example`. Los servicios la leen con `config.getOrThrow<T>(...)` dentro de la factory del módulo, nunca con `process.env` disperso.

Hay un único `.env` en la raíz para las dos apps. `DATABASE_URL` apunta a `localhost` (comandos Prisma desde el host) y `DATABASE_URL_DOCKER` a `postgres-internal` (API dentro de Compose).

## Invariantes de dominio

Romper cualquiera de estas rompe QRs ya impresos o datos de clientes:

- **El slug y el QR son inmutables.** Al crear el restaurante se materializan `slug`, `qrPayload` (`PUBLIC_APP_URL/{slug}`), `qrPng` y `qrSvg` en PostgreSQL en una sola transacción. Ninguna edición posterior de nombre, menú o estilo los toca. `PUBLIC_APP_URL` debe ser el origen HTTPS definitivo *antes* de crear el primer restaurante.
- **Restaurantes legado**: si los tres campos QR están en `null`, `GenerateRestaurantQr` los completa una sola vez con el `PUBLIC_APP_URL` vigente. Configura el dominio final antes de que un dueño antiguo abra `/admin/qr`.
- **Disponibilidad ≠ eliminación.** `isAvailable: false` conserva el producto en el panel y lo retira de la carta pública; volver a habilitarlo lo restaura en la misma URL.
- **Publicación atómica.** La digitización con Gemini reemplaza carta y estilo en una única transacción de PostgreSQL; si algo falla, la carta anterior queda intacta. Las fotos fuente se procesan en memoria y no se persisten.
- **Limpieza de archivos durable.** Eliminar un restaurante registra primero un `AssetDeletionJob` y luego borra `restaurants/<uuid>` del volumen. Si el filesystem falla, el job persiste y `PendingAssetCleanupBootstrap` lo reintenta al arrancar la API.
- **Uploads validados por firma binaria**, no solo por MIME declarado: logo PNG/JPG/WebP ≤2 MB, imagen de producto ≤4 MB, fotos de digitización 1–5 archivos, ≤3 MB cada uno y ≤12 MB en total.
- **Carta pública** en `/{slug}`: solo restaurantes `ENABLED`, solo productos disponibles, y las categorías que quedan vacías se omiten del índice. Deshabilitar responde 404 sin destruir la identidad del QR.

Multi-tenancy: `Product`, `Category`, `ProductVariant` y `ProductExtra` llevan `restaurantId` y claves compuestas `@@unique([id, restaurantId])`; las relaciones se resuelven por el par, de modo que una consulta nunca puede cruzar tenants por accidente.

## Convenciones de código

- **La API es ESM con `NodeNext` y `verbatimModuleSyntax`**: los imports relativos llevan extensión `.js` aunque el archivo sea `.ts`, y los imports de tipo van con `import type`. `apps/web` usa `moduleResolution: "bundler"` y el alias `@/*`, sin extensiones.
- ESLint de la API corre con `recommendedTypeChecked` y exige `explicit-function-return-type`, `consistent-type-imports`, `no-floating-promises` y `no-misused-promises`. La web usa `eslint-config-next` con `--max-warnings=0`.
- `noUncheckedIndexedAccess` está activo en todo el repo.
- Tests unitarios junto al código: `*.spec.ts` en la API (jest + `@swc/jest`, entorno `node`), `*.test.tsx` en la web (jest + Testing Library, entorno `jsdom`). Los E2E viven aparte en `tests/e2e/`.
- La web no usa framework de CSS: hay una sola hoja global en [apps/web/src/app/styles.css](apps/web/src/app/styles.css).
- El código y los identificadores están en inglés; la UI, los mensajes al usuario y los nombres de los tests E2E, en español.

## Notas del repo

- [apps/web/AGENTS.md](apps/web/AGENTS.md) (referenciado desde `apps/web/CLAUDE.md`) lo reescribe `next dev`: esta versión de Next tiene cambios que rompen convenciones conocidas, así que consulta `node_modules/next/dist/docs/` antes de escribir código de Next. Borrarlo del diff solo lo recrea.
- `tutorials/sirio-owner-tutorials/` es un proyecto HyperFrames independiente (videos tutoriales para dueños). **No está en `pnpm-workspace.yaml`** y tiene sus propios scripts y `AGENTS.md`; los comandos del monorepo no lo tocan.
- `.gitignore` incluye `CLAUDE.md`, `.claude/` y `.agents/`, así que este archivo no se versiona tal cual. Si quieres compartirlo con el equipo, hay que excluirlo del ignore.
- `knip.json` declara entradas que no se alcanzan por import (`seed-initial-admin.ts`, `e2e-owner.fixture.ts`, las rutas del App Router). Un archivo nuevo con ese perfil hay que añadirlo ahí o `check:dead-code` lo marcará.
- Despliegue en Dokploy: [docs/dokploy.md](docs/dokploy.md). El dominio se asigna al servicio `nginx` en el puerto interno `80`; `compose.yml` no publica puertos.
