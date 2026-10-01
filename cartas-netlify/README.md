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

## Pruebas

```powershell
pnpm lint
pnpm typecheck
pnpm test        # Vitest
pnpm test:e2e    # Playwright (Chromium de escritorio) contra netlify dev
```

La primera vez, Playwright necesita su navegador: `pnpm exec playwright install chromium`.
