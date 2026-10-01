# Progreso — Sirio Cartas (versión Netlify)

## Fase actual

Fase 3 de 13 — Cuentas, registro e inicio de sesión.

## Fases completadas

1. Esqueleto, reglas y diseño base.
2. Base de datos: esquema Drizzle, migración inicial y `GET /api/salud`.

## Decisiones

### Generales (fase 1)

- **Construcción local, no en Agent Runners.** Los créditos del plan Free no alcanzaron. La app se desarrolla en esta máquina con `netlify dev` y se desplegará al final con la CLI al proyecto existente.
- **Ubicación.** Carpeta `cartas-netlify/` del repositorio Sistema_Cartas_QR, como app independiente, con su propio `pnpm-workspace.yaml` y lockfile, y pnpm 11.
- **Dominio de los QR.** `PUBLIC_APP_URL=https://sirio-cartas.netlify.app`.
- **Marca.** «Sirio Cartas».
- **Diseño «Papel de bistró».**
  - Paleta: papel `#FBF7F0`, superficie `#FFFDF9`, control `#F2ECE2`, tinta `#1F1B16`, vino `#8C2F39`.
  - Tipografía: Fraunces (títulos) + Inter (texto), aplicadas por superficie.
  - Contraste: todos los textos verificados con AA (mínimo 5,01:1) y el borde de los controles con 3:1.
- **Navegación del panel.** Barra superior con menú (fase 3).
- **Pruebas.** Vitest para la lógica pura y Playwright solo en escritorio (Chromium) contra `netlify dev`. Sin pruebas de integración contra la base de datos.
- **Versiones.** Next 16.3.8, React 19.2.8, Tailwind 4.3, TypeScript 5.9, ESLint 9, Vitest 5, Playwright 1.63, netlify-cli 27.10.2 (devDependency).
- **Scripts de instalación (pnpm 11).** Se permite el de esbuild. Se bloquean los de netlify-cli (solo instala autocompletado de la shell) y unix-dgram (addon nativo para sockets Unix que en Windows no se usa).
- **CLAUDE.md** es el bloque de la sección 5 del plan, adaptado a pnpm y al desarrollo local.
- **Fuentes con Tailwind 4.** `next/font` define `--font-fraunces` y `--font-inter` en el contenedor de cada superficie, así que los tokens de fuente van en `@theme inline`. Sin eso se resolvían en `:root` y caían a la fuente del sistema. Un E2E lo vigila.
- **Monorepo raíz.**
  - `knip.json` ignora `cartas-netlify/**`, porque la app tiene su propio ciclo.
  - El `.gitignore` raíz tiene una excepción `!cartas-netlify/CLAUDE.md`.
  - `netlify dev` añadió `.netlify` al `.gitignore` raíz.
- **Formularios provisionales.** `/entrar` y `/registro` son maquetas: el envío no hace nada hasta la fase 3, y nunca pone datos en la URL.

### Base de datos (fase 2)

- **Drizzle 1.0 RC (`1.0.0-rc.4`) en lugar de beta.** La línea `1.0.0-beta` está marcada como obsoleta («superseded by the 1.0 release candidate»). La RC incluye el adaptador `drizzle-orm/netlify-db` y genera migraciones en el formato que lee Netlify (`<marca de tiempo>_<nombre>/migration.sql`).
- **`drizzle.config.ts` sin credenciales.** Solo se usa `drizzle-kit generate`; sin `dbCredentials`, `push` y `migrate` no pueden alcanzar ninguna base por error.
- **Esquema (`db/schema.ts`)** con todo lo de §E3. Además, restricciones `CHECK` como defensa en profundidad:
  - Correo ya normalizado (`email = lower(btrim(email))`), para que el único no se esquive por mayúsculas.
  - Precios ≥ 0.
  - Descripción nula o de 1 a 2000 caracteres.
  - Hora entre 0 y 23 en las visitas, y conteos positivos en los resúmenes.
- **Índice extra `view_events_view_date_idx`.** La retención de §E11 consolida por fecha en todos los restaurantes.
- **Marcas de tiempo.** `created_at`/`updated_at` en cuentas, restaurantes, secciones, productos y trabajos de digitalización; `created_at` en sesiones. Las variantes y adicionales no las llevan, porque se reemplazan en bloque.
- **El índice parcial usa SQL plano** (`status in ('UPLOADING', 'PROCESSING')`): drizzle-kit lo genera tal cual y no hizo falta editar la migración.
- **Cliente (`db/index.ts`).** `getDb()` crea el cliente en el primer uso, no al importar. Así `next build` no necesita `NETLIFY_DB_URL`, y el cliente se guarda en `globalThis` para que la recarga en caliente no abra pools nuevos. Usa `getDatabase()` de `@netlify/database` y lo pasa a `drizzle()`.
- **Pool de 1 conexión con el driver TCP.** En local, `netlify dev` levanta PGlite y atiende todos los sockets con una sola sesión. Con varias conexiones, sus sentencias y transacciones se mezclarían. Por eso `pg` es dependencia directa: con el driver TCP se crea el pool con `max: 1` y 10 s de espera. Con el driver serverless (Neon) no cambia nada.
  - Consecuencia: una consulta sobre `db` dentro de una transacción no se queda colgada: falla a los 10 s. Dentro de una transacción se usa siempre `tx`.
- **La CLI de Netlify y la raíz del repositorio.** netlify-cli toma como raíz del proyecto el `package.json` más alto (el del monorepo). Por eso `netlify database migrations apply` y `netlify database reset` buscan las migraciones y la base en `E:\Sistema_Cartas_QR`. Probé `build.base`, `--cwd` y `[db.migrations] path`, y ninguno lo resuelve sin enlazar el sitio.
  - `netlify dev` sí guarda la base local en `cartas-netlify/.netlify/db`.
  - Solución: `scripts/local-db.ts` (`pnpm db:local:apply` y `pnpm db:local:reset`). Usa `@netlify/database-dev` 1.0.1, la misma librería que esos comandos de la CLI, contra la base de `netlify dev`. Lee la conexión de `.netlify/state.json` y se niega si no es `localhost`.
  - Se añadió `@netlify/database-dev` como devDependency por esto.
- **E2E.** Un proyecto `base-local` de Playwright reinicia la base local una vez por corrida, después de levantar `netlify dev`. Se niega si `E2E_BASE_URL` no es local.

## Verificación

### Fase 1

- `pnpm lint` y `pnpm typecheck` en verde.
- `pnpm test`: 9 pruebas de slug.
- `pnpm test:e2e`: 6 de 6 en Chromium de escritorio. Cubren la redirección de `/`, los formularios de acceso y registro, las fuentes, que el envío no navega y la 404 en español.
- `pnpm check:dead-code` del repo raíz en verde.

### Fase 2

- `pnpm lint`, `pnpm typecheck` y `pnpm build` en verde (`/api/salud` es dinámica).
- `pnpm test`: 13 pruebas. Además de las de slug, cubren `/api/salud` con 200 y con 503 sin detalles, y que `isDatabaseUp` registra el fallo solo en el servidor.
- `pnpm test:e2e`: 8 de 8. Incluye el reinicio de la base y `GET /api/salud` → `{"ok":true,"database":"up"}` con `Cache-Control: no-store`.
- Comprobación manual en la base local, dentro de una transacción revertida. Se rechazaron:
  - un correo con mayúsculas;
  - un segundo restaurante para la misma cuenta;
  - un producto de un restaurante en la sección de otro (FK compuesta);
  - un precio negativo y una descripción vacía;
  - un segundo trabajo activo, aunque sí se aceptó uno terminado junto al activo;
  - la hora 24.

  Además, `28.5` se guardó como `28.50`, y al borrar la cuenta se borraron en cascada sus secciones.

## Pendientes

- Fase 3: cuentas, registro e inicio de sesión.
- Fase 9: comprobar que `netlify dev` encuentra `netlify/functions` de esta carpeta, por el mismo problema de raíz de la CLI.
- Despliegue: al enlazar el sitio, configurar el directorio base `cartas-netlify` para que la CLI y el build usen esta carpeta.

## Cómo verificar

```powershell
cd cartas-netlify
pnpm install
pnpm lint; pnpm typecheck; pnpm test
pnpm dev:netlify     # http://localhost:8888 (en otra terminal)
pnpm db:local:apply  # aplica las migraciones a la base local
pnpm test:e2e        # reinicia la base local y corre Playwright
```
