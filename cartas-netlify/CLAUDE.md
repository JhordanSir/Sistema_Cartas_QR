@AGENTS.md

# Sirio Cartas — versión Netlify

Sistema de cartas digitales para restaurantes: un dueño se registra, edita su carta (o la digitaliza desde fotos con IA), la publica y la comparte con un QR fijo. El comensal la ve en `/{slug}`. Hay un backoffice mínimo para el administrador. NO hay landing page.

## Antes de trabajar

- Lee PROGRESS.md: dice qué fases están hechas y qué decisiones se tomaron.
- La especificación completa está en docs/ESPECIFICACION.md. Lee SOLO las secciones que indique la fase (E1…E13). El plan por fases está en docs/plan.md.
- Esta versión de Next.js tiene cambios importantes: consulta `node_modules/next/dist/docs/` antes de escribir código de Next (ver AGENTS.md).

## Comandos (desde esta carpeta, con pnpm)

- `pnpm dev:netlify` — app en http://localhost:8888 con la base de datos local, Blobs y funciones de Netlify. Requiere `.env` (copia de `.env.example`).
- `pnpm lint` · `pnpm typecheck` · `pnpm test` (Vitest) · `pnpm test:e2e` (Playwright contra `netlify dev`, solo escritorio).
- Migraciones: `pnpm db:generate --name <cambio>` las crea desde `db/schema.ts`; `pnpm db:local:apply` y `pnpm db:local:reset` actúan sobre la base local de `netlify dev` (que debe estar en marcha). No uses `netlify database migrations apply` ni `netlify database reset`: la CLI toma la raíz del repositorio como raíz del proyecto y apunta a otra carpeta y a otra base.
- `pnpm test:e2e` reinicia la base local antes de cada corrida.
- Esta app tiene su propio `pnpm-workspace.yaml` y su propio lockfile: no forma parte del monorepo de la raíz.

## Stack (no cambiar sin justificarlo en PROGRESS.md)

- Next.js App Router, TypeScript strict, Tailwind CSS. Desplegado en Netlify con su adaptador oficial (no fijes su versión).
- Netlify Database (Postgres) con `@netlify/database` y Drizzle 1.0 RC (`drizzle-orm@rc`, `drizzle-kit@rc`, adaptador `drizzle-orm/netlify-db`; la línea beta quedó obsoleta). Cliente en `db/index.ts` con `getDb()`.
- Netlify Blobs (`@netlify/blobs`) para archivos. Netlify Functions (`@netlify/functions`) para la digitalización (background) y el mantenimiento (scheduled).
- `@google/genai` (Gemini), `qrcode`, `@node-rs/argon2`, `zod`. Pruebas con Vitest y Playwright.
- No añadas otras dependencias salvo que la fase lo pida o sea imprescindible (justifícalo en PROGRESS.md).

## Reglas de código

- Código, identificadores y comentarios en inglés. Toda la interfaz y los mensajes al usuario en español de Perú; los nombres de las pruebas E2E también en español.
- Mobile-first. Todo control interactivo mide al menos 44 px. Formularios accesibles: `<label>` asociado, `aria-invalid` y mensajes de error con `role="alert"` (usa `Field` de `src/components/ui`).
- Los errores de validación se muestran al enviar el formulario y se quitan cuando el usuario corrige el campo. Nunca validar en `onBlur`.
- Lógica pura compartida en `src/shared/`. Código solo de servidor en `src/server/`, con imports relativos (sin alias `@/`), porque también lo usan las funciones de `netlify/functions/`.
- Sin `any`. Valida toda entrada externa (body, params, respuestas de Gemini) con zod o con las funciones de `src/shared`.
- Diseño «Papel de bistró»: usa los tokens de `src/app/globals.css` (paper, raised, control, ink, wine…) y las primitivas de `src/components/ui`; no inventes colores sueltos. Las fuentes del panel (Fraunces + Inter) se aplican por superficie, nunca en el layout raíz.

## Seguridad (obligatorio)

- Toda petición que modifica datos (POST, PUT, PATCH, DELETE) verifica que la cabecera `Origin` coincida con el host. Si no coincide, responde 403.
- Cada Route Handler y cada función se autentican con la sesión. El restaurante del dueño se obtiene SIEMPRE de la sesión, nunca de un id enviado por el cliente.
- Cada consulta sobre secciones, productos, variantes, adicionales y trabajos filtra también por `restaurant_id` del dueño. Si no hay fila, responde 404.
- Cookies de sesión HttpOnly, Secure y SameSite=Lax. Contraseñas con Argon2id. En la base de datos solo se guarda el SHA-256 del token de sesión.
- Ningún secreto en el cliente: nunca uses el prefijo `NEXT_PUBLIC_` para secretos.
- Las subidas se validan por firma binaria (no solo por el MIME declarado) y por tamaño.

## Netlify (límites reales)

- Páginas y Route Handlers: 60 s como máximo. Background Functions: hasta 15 min, pero el cuerpo de invocación no puede pasar de 256 KB. Funciones programadas: 30 s.
- Cuerpo de petición: 6 MB (unos 4,5 MB de binario). Las imágenes se comprimen en el navegador antes de subir.
- Migraciones SOLO como archivos en `netlify/database/migrations/` (con `drizzle-kit generate`). NUNCA `drizzle-kit push` ni `migrate` contra la base alojada.
- `getStore('uploads')` es compartido entre producción y previews: las claves llevan el UUID del restaurante o del trabajo, y nunca se borra por prefijos ajenos.
- Variables de entorno: en Next con `process.env`, en `netlify/functions` con `Netlify.env.get()`.

## Invariantes del dominio

- El slug se genera al registrarse y no cambia nunca. El QR se genera una sola vez y no cambia nunca. Cambiar el nombre del restaurante no los toca.
- Borrador ≠ publicada: la carta pública solo cambia al publicar (snapshot JSON atómico).
- «No disponible» oculta el producto en la carta pública, pero lo conserva en el borrador.
- Un restaurante pausado responde 404 en su carta pública.
- Precios en soles (PEN) con 2 decimales.

## Al terminar cada fase

- Ejecuta `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm test:e2e`.
- Actualiza PROGRESS.md: fase completada, archivos clave, decisiones tomadas, pendientes y cómo verificarlo.
- Sin refactors ni mejoras fuera del alcance de la fase.
