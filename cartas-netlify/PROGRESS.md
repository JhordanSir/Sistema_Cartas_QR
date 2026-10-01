# Progreso — Sirio Cartas (versión Netlify)

## Fase actual

Fase 1 de 13 — Esqueleto, reglas y diseño base (en revisión).

## Fases completadas

_Ninguna todavía._

## Decisiones

- **Construcción local, no en Agent Runners.** Los créditos del plan Free no alcanzaron. La app se desarrolla en esta máquina con `netlify dev` y se desplegará al final con la CLI al proyecto existente.
- **Ubicación.** Carpeta `cartas-netlify/` del repositorio Sistema_Cartas_QR, como app independiente, con su propio `pnpm-workspace.yaml` y lockfile, y pnpm 11.
- **Dominio de los QR.** `PUBLIC_APP_URL=https://sirio-cartas.netlify.app`.
- **Marca.** «Sirio Cartas».
- **Diseño «Papel de bistró».**
  - Paleta: papel `#FBF7F0`, superficie `#FFFDF9`, control `#F2ECE2`, tinta `#1F1B16`, vino `#8C2F39`.
  - Tipografía: Fraunces (títulos) + Inter (texto), aplicadas por superficie.
  - Contraste: todos los textos verificados con AA (mínimo 5,01:1) y el borde de los controles con 3:1.
- **Navegación del panel.** Barra superior con menú (fase 3).
- **Pruebas.** Vitest para la lógica pura y Playwright solo en escritorio (Chromium) contra `netlify dev`, más la checklist manual del usuario en cada pausa.
- **Versiones.** Next 16.3.8, React 19.2.8, Tailwind 4.3, TypeScript 5.9, ESLint 9, Vitest 5, Playwright 1.63, netlify-cli 27.10.2 (devDependency).
- **Scripts de instalación (pnpm 11).** Se permite el de esbuild. Se bloquean los de netlify-cli (solo instala autocompletado de la shell) y unix-dgram (addon nativo para sockets Unix que en Windows no se usa).
- **CLAUDE.md** es el bloque de la sección 5 del plan, adaptado a pnpm y al desarrollo local.
- **Fuentes con Tailwind 4.** `next/font` define `--font-fraunces` y `--font-inter` en el contenedor de cada superficie, así que los tokens de fuente van en `@theme inline`. Sin eso se resolvían en `:root` y caían a la fuente del sistema. Un E2E lo vigila.
- **Monorepo raíz.**
  - `knip.json` ignora `cartas-netlify/**`, porque la app tiene su propio ciclo.
  - El `.gitignore` raíz tiene una excepción `!cartas-netlify/CLAUDE.md`.
  - `netlify dev` añadió `.netlify` al `.gitignore` raíz.
- **Formularios provisionales.** `/entrar` y `/registro` son maquetas: el envío no hace nada hasta la fase 3, y nunca pone datos en la URL.
- **Carpetas sin contenido.** `src/server`, `db` y `netlify/functions` se crean en sus fases; git no guarda carpetas vacías.

## Verificación de la fase 1

- `pnpm lint` y `pnpm typecheck` en verde.
- `pnpm test`: 9 pruebas de slug.
- `pnpm test:e2e`: 6 de 6 en Chromium de escritorio. Cubren la redirección de `/`, los formularios de acceso y registro, las fuentes, que el envío no navega y la 404 en español.
- `pnpm check:dead-code` del repo raíz en verde.

## Pendientes

- Fase 2: base de datos (Netlify Database + Drizzle).

## Cómo verificar

```powershell
cd cartas-netlify
pnpm install
pnpm lint; pnpm typecheck; pnpm test
pnpm test:e2e        # levanta netlify dev si no está corriendo
pnpm dev:netlify     # http://localhost:8888
```
