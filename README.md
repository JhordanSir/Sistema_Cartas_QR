# Sistema de Cartas QR — Sirio Automatiza

Monorepo para digitalizar cartas de restaurantes y publicarlas mediante un QR fijo. El backend es una API NestJS, la interfaz usa Next.js y los datos se almacenan en PostgreSQL mediante Prisma.

La **Fase 0 está implementada**: scaffolding, modelo de datos, slugs, pruebas, imágenes Docker y Compose compatible con Dokploy. La Fase 1 todavía no ha comenzado.

## Estructura

```text
apps/
  api/                 API NestJS y healthchecks
  web/                 Next.js App Router
packages/
  shared/              utilidades y tipos compartidos
prisma/
  migrations/          migraciones versionadas
  schema.prisma        modelo multi-tenant
docker/                Dockerfiles de producción
compose.yml            despliegue de producción/Dokploy
compose.dev.yml        puertos loopback solo para desarrollo local
```

## Requisitos

- Node.js 24 o superior.
- pnpm 11.1.1.
- Docker Engine y Docker Compose.

## Inicio rápido con Docker

1. Crea el archivo local de configuración en la raíz:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Reemplaza en `.env` las contraseñas y secretos de ejemplo. Usa valores URL-safe para `POSTGRES_PASSWORD`.

3. Instala y levanta el stack:

   ```powershell
   pnpm install --frozen-lockfile
   pnpm compose:dev
   ```

4. Comprueba:

   - Web: `http://127.0.0.1:3000`
   - Health de web: `http://127.0.0.1:3000/health`
   - Health de API mediante el proxy: `http://127.0.0.1:3000/api/health`

`compose.yml` ejecuta las migraciones antes de iniciar la API y espera los healthchecks de PostgreSQL, API y web. `compose.dev.yml` publica los puertos necesarios únicamente en loopback. Para detener los contenedores sin borrar datos:

```powershell
pnpm compose:dev:down
```

No uses `docker compose down --volumes` si quieres conservar la base y las imágenes.

## Desarrollo nativo

Expón PostgreSQL y API únicamente en loopback usando el override local:

```powershell
docker compose --env-file .env -f compose.yml -f compose.dev.yml up -d postgres
pnpm db:deploy
pnpm dev
```

Las apps leen el mismo `.env` de la raíz; no se requieren archivos `.env` dentro de `apps/api` ni `apps/web`.

## Validaciones

```powershell
pnpm db:validate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

La suite E2E presupone que el Compose está levantado. `pnpm peers check` permite confirmar que las versiones fijadas no tienen peer dependencies incompatibles.

## Variables de entorno

El contrato completo está en [`.env.example`](.env.example). Las dos URLs de base resuelven contextos distintos:

- `DATABASE_URL`: comandos Prisma ejecutados desde el host (`localhost`).
- `DATABASE_URL_DOCKER`: API dentro de Compose (`postgres`).

De forma equivalente, `API_INTERNAL_URL` se usa en desarrollo nativo y `API_INTERNAL_URL_DOCKER` durante el build/despliegue del contenedor web. Ningún secreto se copia dentro de las imágenes Docker.

## Persistencia

- `postgres_data`: datos de PostgreSQL.
- `uploads_data`: logos, cartas e imágenes bajo `/app/storage`.

Ambos son volúmenes Docker nombrados y sobreviven a recreaciones de contenedores.

## Despliegue con Dokploy

Consulta la guía paso a paso en [`docs/dokploy.md`](docs/dokploy.md). En resumen: crea un servicio **Docker Compose**, usa `./compose.yml`, carga las variables de producción en la pestaña Environment y asigna el dominio nativo al servicio `web` en el puerto interno `3000`.

El plan funcional completo está en [`PLAN.md`](PLAN.md) y los requisitos fuente en [`Requerimientos_Sistema_Cartas_QR.md`](Requerimientos_Sistema_Cartas_QR.md).
