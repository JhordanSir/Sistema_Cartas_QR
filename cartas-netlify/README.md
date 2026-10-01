# Sirio Cartas — versión Netlify

Cartas digitales para restaurantes, pensadas para Netlify: registro de dueños, editor de la carta, digitalización con IA, publicación con un QR fijo, estadísticas de visitas y un backoffice mínimo. No incluye landing page.

> En construcción por fases. Ver [docs/plan.md](docs/plan.md), [docs/ESPECIFICACION.md](docs/ESPECIFICACION.md) y [PROGRESS.md](PROGRESS.md).

## Requisitos

- Node.js 24 o superior y pnpm 11.
- Esta carpeta es un proyecto independiente: tiene su propio `pnpm-workspace.yaml` y lockfile.

## Desarrollo local

```powershell
cd cartas-netlify
pnpm install
copy .env.example .env
pnpm dev:netlify   # http://localhost:8888
```

`netlify dev` (la CLI va como dependencia de desarrollo) sirve Next.js junto con la base de datos local, Netlify Blobs y las funciones.

Cualquier otro comando de la CLI se lanza con `pnpm cli:netlify <argumentos>`. El envoltorio hace que la CLI tome esta carpeta como raíz del proyecto; por su cuenta tomaría la del repositorio, con su `.env`.

La primera cuenta que se registra en `/registro` es la del administrador; las siguientes son de dueños, cada una con su restaurante.

## Base de datos

El esquema vive en `db/schema.ts` (Drizzle) y las migraciones SQL en `netlify/database/migrations/`. Netlify las aplica solo al desplegar.

```powershell
pnpm db:generate --name <cambio>   # nueva migración a partir de db/schema.ts
pnpm db:local:apply                # aplica las pendientes a la base local (con netlify dev en marcha)
pnpm db:local:reset                # vacía la base local y aplica todas las migraciones
```

Los dos últimos solo actúan sobre la base local que levanta `netlify dev` y se niegan si la conexión no es `localhost`. Nunca uses `drizzle-kit push` ni `migrate`.

## Pruebas

```powershell
pnpm lint
pnpm typecheck
pnpm test        # Vitest
pnpm test:e2e    # Playwright (Chromium de escritorio) contra netlify dev
```

La primera vez, Playwright necesita su navegador: `pnpm exec playwright install chromium`.

Cada corrida de `pnpm test:e2e` empieza reiniciando la base local (proyecto `base-local` de Playwright), así que borra los datos que hayas creado a mano en `netlify dev`.
