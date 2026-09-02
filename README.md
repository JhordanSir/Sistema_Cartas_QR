# Sistema de Cartas QR — Sirio Automatiza

Monorepo para digitalizar cartas de restaurantes y publicarlas mediante un QR fijo. El backend es una API NestJS, la interfaz usa Next.js y los datos se almacenan en PostgreSQL mediante Prisma.

Las **Fases 0 a 7 están implementadas**: fundamentos, autenticación, backoffice, ciclo de vida de restaurantes, perfil del dueño, digitalización con Gemini, gestión completa de la carta, QR fijo persistido y analítica de vistas, con pruebas e imágenes Docker compatibles con Dokploy.

## Estructura

```text
apps/
  api/                 API NestJS, autenticación, restaurantes y healthchecks
  web/                 Next.js App Router, panel del dueño y backoffice
packages/
  shared/              utilidades y tipos compartidos
prisma/
  migrations/          migraciones versionadas
  schema.prisma        modelo multi-tenant
docker/                Dockerfiles de producción
compose.yml            despliegue de producción/Dokploy con gateway Nginx interno
compose.dev.yml        puertos loopback solo para desarrollo local
compose.nginx-host.yml publicación opcional del gateway para un Nginx externo
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
   - Login del backoffice: `http://127.0.0.1:3000/login`
   - Login del dueño: `http://127.0.0.1:3000/admin/login`

`compose.yml` ejecuta las migraciones y el seed idempotente del administrador inicial antes de iniciar la API; después espera los healthchecks de PostgreSQL, API y web. `compose.dev.yml` publica los puertos necesarios únicamente en loopback. Para detener los contenedores sin borrar datos:

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
- `DATABASE_URL_DOCKER`: API dentro de Compose (`postgres-internal`).

`API_INTERNAL_URL` se usa únicamente en desarrollo nativo. En Compose, la web usa automáticamente el alias privado `api-internal`, evitando colisiones con servicios de otros proyectos Dokploy. Ningún secreto se copia dentro de las imágenes Docker.

`PUBLIC_APP_URL` debe ser el origen HTTPS canónico y definitivo de producción, por ejemplo `https://cartas.example.com`, sin una ruta adicional. Configúralo antes de crear el primer restaurante: cada alta materializa y guarda el QR con `PUBLIC_APP_URL/{slug}`. Cambiar esa variable después no altera los QR ya impresos ni sus archivos persistidos.

Los secretos JWT de access y refresh deben ser distintos y tener al menos 32 caracteres. `JWT_ISSUER` y `JWT_AUDIENCE` se validan al verificar cada token. El administrador inicial se crea una sola vez desde `INITIAL_ADMIN_EMAIL` e `INITIAL_ADMIN_PASSWORD`.

## Autenticación

El login requiere indicar explícitamente el rol para evitar ambigüedades entre cuentas de dueño y administrador:

```json
{
  "email": "admin@example.com",
  "password": "contraseña-segura",
  "role": "ADMIN"
}
```

Endpoints disponibles bajo `/api/auth`:

- `POST /login`: entrega access y refresh token.
- `POST /refresh`: rota el refresh token; reutilizar el anterior revoca la sesión.
- `POST /logout`: revoca la sesión asociada.
- `GET /me`: devuelve el principal autenticado.
- `POST /password`: cambio propio del dueño.
- `POST /admin/password`: cambio propio del administrador inicial.
- `POST /admin/owners/:ownerId/reset-password`: reseteo de un dueño, exclusivo del administrador.

Las contraseñas usan Argon2id. Cambiar o resetear una contraseña revoca todas las sesiones de esa cuenta. Todas las rutas son privadas por defecto; solo healthchecks, autenticación y consulta de un restaurante público están marcadas explícitamente como públicas.

La web conserva access y refresh tokens en cookies `HttpOnly`, `SameSite=Strict`; el navegador no expone los JWT a JavaScript. Los Route Handlers de Next.js actúan como BFF, validan el origen de las mutaciones y renuevan la sesión cuando corresponde.

## Backoffice y restaurantes

El administrador ingresa por `/login` y gestiona los restaurantes en `/backoffice`. El alta solicita nombre, correo del dueño y contraseña inicial; crea transaccionalmente la cuenta, la relación, un slug único e inmutable y el QR permanente (payload público, PNG y SVG).

Endpoints de administración bajo `/api/backoffice/restaurants`:

- `GET /`: listado, búsqueda y filtro por estado.
- `POST /`: alta de restaurante y dueño.
- `PATCH /:id/status`: deshabilitar o reactivar sin bloquear el panel del dueño.
- `DELETE /:id`: eliminación definitiva; exige `acknowledgePermanentDeletion: true` y el texto exacto `ELIMINAR <slug>`.

`GET /api/restaurants/public/:slug` devuelve solo restaurantes habilitados con sus categorías y productos disponibles. La ruta web `/{slug}` muestra la carta publicada y responde con la página 404 cuando el local está deshabilitado o eliminado.

La eliminación usa cascadas de PostgreSQL, elimina al dueño si ya no administra otro restaurante y registra primero una tarea durable de limpieza del directorio `restaurants/<uuid>`. Si el volumen falla, la API conserva la tarea y la reintenta al arrancar, evitando archivos sin seguimiento.

## Panel del dueño y perfil

El dueño ingresa por `/admin/login` y administra su perfil en `/admin`. La sesión usa el mismo BFF seguro del backoffice, pero conserva y valida explícitamente el rol `OWNER` para impedir cruces entre paneles.

Endpoints del propietario:

- `GET /api/owner/restaurants`: restaurantes asociados a la cuenta autenticada.
- `GET /api/owner/restaurants/:restaurantId/profile`: perfil, protegido por rol y pertenencia.
- `PATCH /api/owner/restaurants/:restaurantId/profile`: actualización multipart de teléfono, WhatsApp, dirección, redes y logo.
- `GET /api/owner/restaurants/:restaurantId/logo`: lectura autenticada del logo.

El logo admite PNG, JPG o WebP con un máximo de 2 MB. La API comprueba tanto el MIME declarado como la firma binaria y guarda el archivo en `restaurants/<uuid>/profile/logo`. Las redes sociales son opcionales, requieren HTTPS y se restringen al dominio de la plataforma indicada.

## Digitalización con Gemini

El dueño digitaliza su carta desde `/admin/menu`. Puede enviar de 1 a 5 fotografías JPG, PNG o WebP, con un máximo de 3 MB por archivo y 12 MB totales. La API valida también la firma binaria antes de enviar las imágenes inline a Gemini. Las fotos se procesan en memoria y no se almacenan en Sirio.

Gemini devuelve un objeto estructurado con categorías, productos, descripciones, precios, variantes, adicionales y una estimación de colores/tipografía. El núcleo valida y normaliza ese objeto; luego reemplaza la carta y el estilo en una sola transacción de PostgreSQL. Si algo falla, la carta anterior permanece intacta. El panel permite corregir o completar cualquier producto y refleja el cambio inmediatamente en `/{slug}`.

Endpoints del propietario:

- `GET /api/owner/restaurants/:restaurantId/menu`: carta publicada.
- `POST /api/owner/restaurants/:restaurantId/menu/digitize`: carga multipart bajo el campo `photos` y publicación síncrona.
- `PATCH /api/owner/restaurants/:restaurantId/menu/products/:productId`: edición posterior de un producto.

`GEMINI_TIMEOUT_MS` controla el timeout por intento y `GEMINI_MAX_RETRIES` limita los reintentos. Solo se reintentan fallos transitorios (408, 429, 5xx, timeout o red), con backoff exponencial y jitter. Tras fallos repetidos se abre temporalmente el circuito para proteger la API y entregar un mensaje claro al dueño.

## Gestión de la carta

Desde `/admin/menu`, el dueño puede crear, renombrar, reordenar y eliminar secciones; también puede crear, mover, editar y eliminar productos. Cada producto admite precio base, descripción, variantes y adicionales con precios propios, además de una imagen opcional PNG, JPG o WebP de hasta 4 MB validada por firma binaria.

La disponibilidad es independiente de la eliminación: marcar un producto como no disponible conserva todos sus datos en el panel y lo retira inmediatamente de la carta pública. Al volver a habilitarlo reaparece en la misma URL `/{slug}`; ninguna edición cambia el enlace que usará el QR.

Endpoints de gestión bajo `/api/owner/restaurants/:restaurantId/menu`:

- `POST /categories`, `PATCH|DELETE /categories/:categoryId` y `PUT /categories-order`.
- `POST /products`, `PATCH|DELETE /products/:productId` y `PATCH /products/:productId/availability`.
- `PUT /categories/:categoryId/products-order`.
- `PUT|GET|DELETE /products/:productId/image`.

La imagen pública se sirve únicamente si el restaurante y el producto están habilitados. Las eliminaciones de producto o sección retiran también sus archivos del volumen persistente.

## Código QR y carta pública

El dueño administra su código desde `/admin/qr`. Allí puede previsualizarlo, copiar el enlace permanente y descargarlo en los dos formatos disponibles: PNG para uso digital o impresión rápida y SVG para imprenta o gran formato. El enlace contenido por el QR es exactamente `PUBLIC_APP_URL/{slug}`.

Al crear el restaurante se almacenan una única vez el payload y los bytes PNG/SVG. El slug, la URL y ambos archivos quedan protegidos contra modificaciones: editar el menú, precios, disponibilidad o nombre visible cambia lo que ve el cliente, nunca el código que ya se imprimió. Se considera legado un restaurante que aún tiene los tres campos `qrPayload`, `qrPng` y `qrSvg` sin materializar; al consultar por primera vez el QR, su dueño los completa una sola vez con el `PUBLIC_APP_URL` vigente. Por ello, una base existente también debe configurar el dominio final antes de abrir `/admin/qr` para sus restaurantes antiguos.

La web expone rutas BFF de Next.js bajo `/api/owner/...`; estas reenvían al endpoint homónimo de Nest sin exponer JWT al navegador. Todas están restringidas al dueño asociado al restaurante:

- `GET /api/owner/restaurants/:restaurantId/qr`: devuelve la identidad y URL pública fija.
- `GET /api/owner/restaurants/:restaurantId/qr/png` y `.../svg`: muestran el documento QR.
- `GET /api/owner/restaurants/:restaurantId/qr/png?download=true` y `.../svg?download=true`: entregan el archivo como descarga con un nombre basado en el slug.

La carta pública está en `/{slug}`, no requiere inicio de sesión y se sirve solo mientras el restaurante esté habilitado. Muestra únicamente productos disponibles y omite del índice y de la carta las categorías que quedan sin productos visibles; en móvil ofrece un índice horizontal de las categorías restantes que lleva a cada sección sin ocultar la navegación principal. Si el restaurante se deshabilita, el QR conserva su identidad, pero la URL pública responde 404 hasta reactivarlo.

## Persistencia

- `postgres_data`: datos de PostgreSQL.
- `uploads_data`: logos e imágenes de productos bajo `/app/storage`; las fotos fuente de la carta no se conservan.

Los payloads y documentos QR se guardan en PostgreSQL junto al restaurante, no en `uploads_data`.

Ambos son volúmenes Docker nombrados y sobreviven a recreaciones de contenedores.

## Despliegue con Dokploy

Consulta la guía paso a paso en [`docs/dokploy.md`](docs/dokploy.md). En resumen: crea un servicio **Docker Compose**, usa `./compose.yml`, carga las variables de producción en la pestaña Environment y asigna el dominio nativo al servicio `nginx` en el puerto interno `80`. Define `PUBLIC_APP_URL` con ese dominio HTTPS final antes de crear restaurantes para que los QR impresos apunten al origen correcto.

El plan funcional completo está en [`PLAN.md`](PLAN.md) y los requisitos fuente en [`Requerimientos_Sistema_Cartas_QR.md`](Requerimientos_Sistema_Cartas_QR.md).
