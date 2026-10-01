# Plan para Netlify Agent Runners — Sirio Cartas, versión Netlify

> Datos de Netlify (límites, créditos, APIs) verificados en su documentación el **30 de septiembre de 2026**. Ver la sección 9, «Fuentes».

## 0. Qué es este plan y cómo se usa

Este archivo guía a **Netlify Agent Runners con el agente Claude Code** para construir, en un proyecto nuevo **sin Git**, una versión del sistema de cartas digitales de Sirio:

- registro libre de dueños de restaurante;
- panel para editar la carta, digitalizarla con IA desde fotos y publicarla;
- carta pública en `/{slug}` con un QR que nunca cambia;
- estadísticas de visitas;
- un backoffice mínimo para el administrador.

**No incluye la landing page.**

El plan tiene tres partes:

1. **Para ti** (secciones 1–4): decisiones tomadas, preparación, presupuesto de créditos y el ciclo de trabajo de cada fase.
2. **Para el agente** (secciones 5 y 6): las reglas permanentes (`CLAUDE.md`) y la especificación (`docs/ESPECIFICACION.md`). El agente las copia al proyecto en la fase 1, así que los prompts siguientes son cortos.
3. **Las 13 fases** (sección 7): cada una con el prompt exacto, lo que debes revisar en el Deploy Preview y su costo relativo.

---

## 1. Decisiones cerradas

| Tema | Decisión |
|---|---|
| IA de Netlify | Agent Runners, agente **Claude Code**, modo **Build** |
| Proyecto | Nuevo, creado desde un prompt en netlify.new, **sin Git** |
| Plan de Netlify | **Free** (300 créditos/mes). Si no alcanza, se construye en local y solo se despliega en Netlify |
| Flujo | **Una ejecución por fase**; se revisa el Deploy Preview y se pulsa **Publish** antes de empezar la siguiente |
| Visibilidad | **Privada** mientras se construye (solo tú, con tu sesión de Netlify); pública en la fase 13 |
| Arquitectura | Next.js (App Router) nativo de Netlify + **Netlify Database** (Postgres) con Drizzle + **Netlify Blobs** + Background y Scheduled Functions |
| Alcance | Sin landing. `/` redirige a `/entrar` |
| Alta de restaurantes | **Registro libre** del dueño: **un restaurante por cuenta**, creado al registrarse |
| Administrador | **La primera cuenta registrada** es la del administrador, y **no tiene restaurante**. Desde la segunda, cada registro es de dueño |
| Autenticación | **Propia**: correo y contraseña con Argon2id, sesión en cookie HttpOnly guardada en base de datos |
| Correos | **Ninguno**: sin confirmación de cuenta; «¿Olvidaste tu contraseña?» solo muestra un texto. El administrador pone contraseñas temporales |
| Antiabuso | Ninguno |
| Módulos | Perfil, editor de la carta, publicación, carta pública, QR fijo, **digitalización con IA**, **estadísticas**, **plantillas visuales**, **imágenes de producto**, backoffice |
| Extras | Solo **validación con expresiones regulares** (correo y contraseña). Sin i18n, sin modo oscuro, sin clima |
| IA para digitalizar | **Clave propia de Gemini** (Google AI Studio), no el AI Gateway de Netlify |
| Dominio de los QR | **Subdominio `netlify.app` definitivo**, fijado al renombrar el proyecto tras la fase 1 |
| Digitalizar con un borrador existente | **Reemplaza** todo el borrador, tras confirmarlo; la carta publicada no cambia hasta publicar |
| Nombre del restaurante | **Editable** desde el perfil; el slug y el QR quedan fijos desde el registro |
| Moneda | **Soles (PEN)** fijos |
| Diseño del panel | **Nuevo, propuesto por la IA**. La carta pública usa los colores y la fuente de la plantilla del restaurante |
| Pruebas | **Unitarias con Vitest** en la lógica crítica + **checklist manual** en cada Deploy Preview |
| Idioma | Prompts e interfaz en español; código, identificadores y comentarios en inglés |

---

## 2. Fase 0 — Preparación (manual)

### Antes de la fase 1

1. **Clave de Gemini.** En [Google AI Studio](https://aistudio.google.com/) crea una API key (gratuita). La necesitarás antes de la fase 10.
2. **Nombre del subdominio.** Elige el nombre definitivo, por ejemplo `sirio-cartas` → `https://sirio-cartas.netlify.app`. Todos los QR guardarán esa dirección para siempre.
3. **Modelo del agente.** En la configuración de modelos de Agent Runners, deja que Claude Code elija el modelo, o fija uno según la columna «Costo» de cada fase (sección 3).

### Justo después de publicar la fase 1

1. **Renombra el proyecto.** *Project configuration → General → Project details → Change project name*, con el nombre que elegiste.
2. **Hazlo privado.** *Project configuration → General → Visitor access → Project visibility* → **Private**, para producción y previews.
3. **Variables de entorno.** *Project configuration → Environment variables*, con ámbito **All scopes**; marca las secretas como «Contains secret values»:

| Variable | Valor | Secreta | Necesaria desde |
|---|---|---|---|
| `PUBLIC_APP_URL` | `https://<tu-subdominio>.netlify.app` (sin barra final) | No | Fase 4 |
| `SIRIO_GEMINI_API_KEY` | La clave de Google AI Studio | Sí | Fase 10 |
| `GEMINI_MODEL` | Opcional. Por defecto `gemini-2.5-flash`, el del sistema actual; si Google lo retiró, el modelo Flash vigente que muestre AI Studio | No | Fase 10 |
| `VIEW_HASH_SECRET` | 64 caracteres hexadecimales aleatorios (por ejemplo, de `openssl rand -hex 32`) | Sí | Fase 11 |

`NETLIFY_DB_URL` la crea Netlify sola al instalar `@netlify/database`; no la toques. Las variables se leen al desplegar: después de cambiarlas hay que volver a publicar.

---

## 3. Presupuesto de créditos (plan Free)

| Concepto | Créditos |
|---|---|
| Incluidos por mes en Free | 300 (tope fijo: sin packs ni recarga) |
| Cada **Publish** (despliegue a producción) | 15 → 13 fases = **195** |
| Inferencia del agente | 180 créditos por cada 1 USD de uso del modelo, más el cómputo del entorno |

**Estimación propia, no de Netlify**, del costo de inferencia por fase con un modelo tipo Sonnet: **bajo** ≈ 100–200 créditos, **medio** ≈ 200–400, **alto** ≈ 400–800.

**Conclusión honesta:** en Free cabe como mucho una fase por mes, y las de costo alto pueden cortarse a medias. Si una ejecución se cancela por falta de créditos, cuando el saldo se renueve se **continúa la misma ejecución** (sección 4, paso 6). Si el ritmo no te sirve, avísame y lo construimos en local con este mismo plan (sección 8).

Para gastar menos:

- En las fases de costo **bajo**, elige el modelo más barato en la configuración de modelos.
- Revisa bien el Deploy Preview antes de publicar, para no publicar dos veces.
- No lances ejecuciones nuevas para retoques sueltos: pide los arreglos en la misma ejecución.
- Evita el modo Ask salvo que estés bloqueado.

---

## 4. Ciclo de cada fase

1. En **Agent Runs**, inicia una ejecución nueva en modo **Build** con el agente **Claude Code** y pega el prompt de la fase. Solo en la fase 1: adjunta este `plan.md` (o créalo desde netlify.new con el archivo adjunto).
2. Espera al estado **Done**. Si el agente pregunta algo, responde: mientras espera no gasta créditos.
3. Abre el **Deploy Preview** y recorre la checklist de la fase. El preview tiene **su propia base de datos aislada**: lo que registres ahí no llega a producción.
4. Si algo falla, en **la misma ejecución** envía:
   > En el Deploy Preview falla esto: [qué hiciste, qué esperabas, qué pasó]. Corrígelo sin tocar nada más y actualiza PROGRESS.md.
5. Cuando la checklist pasa, pulsa **Publish** (15 créditos). Una ejecución nueva parte de lo **publicado**: no empieces la fase siguiente sin publicar.
6. Si la ejecución se **cancela por créditos**, al renovarse abre la misma ejecución y envía:
   > Continúa la fase N. Lee PROGRESS.md y termina lo pendiente sin rehacer lo que ya está hecho.

---

## 5. `CLAUDE.md` del proyecto

En la fase 1, el agente copia **literalmente** el contenido de este bloque a `CLAUDE.md`. Claude Code lo carga en cada ejecución.

````markdown
# Sirio Cartas — versión Netlify

Sistema de cartas digitales para restaurantes: un dueño se registra, edita su carta (o la digitaliza desde fotos con IA), la publica y la comparte con un QR fijo. El comensal la ve en `/{slug}`. Hay un backoffice mínimo para el administrador. NO hay landing page.

## Antes de trabajar

- Lee PROGRESS.md: dice qué fases están hechas y qué decisiones se tomaron.
- La especificación completa está en docs/ESPECIFICACION.md. Lee SOLO las secciones que indique la fase (E1…E13).

## Stack (no cambiar sin justificarlo en PROGRESS.md)

- Next.js App Router, TypeScript strict, Tailwind CSS. Desplegado en Netlify con su adaptador oficial (no fijes su versión).
- Netlify Database (Postgres) con `@netlify/database` y Drizzle (`drizzle-orm@beta`, `drizzle-kit@beta`, adaptador `drizzle-orm/netlify-db`).
- Netlify Blobs (`@netlify/blobs`) para archivos. Netlify Functions (`@netlify/functions`) para la digitalización (background) y el mantenimiento (scheduled).
- `@google/genai` (Gemini), `qrcode`, `@node-rs/argon2`, `zod`. Pruebas con Vitest.
- No añadas otras dependencias salvo que la fase lo pida o sea imprescindible (justifícalo en PROGRESS.md).

## Reglas de código

- Código, identificadores y comentarios en inglés. Toda la interfaz y los mensajes al usuario en español de Perú.
- Mobile-first. Todo control interactivo mide al menos 44 px. Formularios accesibles: `<label>` asociado, `aria-invalid` y mensajes de error con `role="alert"`.
- Los errores de validación se muestran al enviar el formulario y se quitan cuando el usuario corrige el campo. Nunca validar en `onBlur`.
- Lógica pura compartida en `src/shared/`. Código solo de servidor en `src/server/`, con imports relativos (sin alias `@/`), porque también lo usan las funciones de `netlify/functions/`.
- Sin `any`. Valida toda entrada externa (body, params, respuestas de Gemini) con zod o con las funciones de `src/shared`.

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

## Ahorro de créditos

- No explores el repo entero: abre solo los archivos que la fase necesita.
- Ejecuta `npm run lint`, `npm run typecheck` y `npm test` una vez al final (y otra solo si corriges algo).
- Sin refactors ni mejoras fuera del alcance de la fase.
- Si algo ambiguo te bloquea, pregunta. Si no, elige lo más simple compatible con la especificación y anótalo en PROGRESS.md.

## Al terminar cada fase

Actualiza PROGRESS.md: fase completada, archivos clave, decisiones tomadas, pendientes y cómo verificarlo. El resumen final de la ejecución debe listar lo mismo.
````

---

## 6. Especificación

En la fase 1, el agente copia **literalmente** las secciones E1 a E13 a `docs/ESPECIFICACION.md`.

### E1. Alcance y rutas

**Páginas**

| Ruta | Acceso | Qué hace |
|---|---|---|
| `/` | Todos | Redirige a `/entrar`, o al panel que corresponda si hay sesión |
| `/entrar` | Público | Inicio de sesión (dueño o administrador) |
| `/registro` | Público | Si no existe ninguna cuenta: crear la cuenta de administrador. Si ya existe: registro de dueño con su restaurante |
| `/panel` | Dueño | Perfil del restaurante |
| `/panel/carta` | Dueño | Editor del borrador, digitalización, plantillas y publicación |
| `/panel/qr` | Dueño | Código QR |
| `/panel/estadisticas` | Dueño | Estadísticas de visitas |
| `/panel/cuenta` | Dueño | Cambiar contraseña |
| `/admin` | Administrador | Backoffice |
| `/admin/cuenta` | Administrador | Cambiar contraseña |
| `/{slug}` | Público | Carta pública |
| `/media/{...clave}` | Público | Imágenes (logos y productos) |

**API (Route Handlers)**

| Método y ruta | Qué hace |
|---|---|
| `POST /api/registro` | Registro de administrador (primera cuenta) o de dueño + restaurante |
| `POST /api/sesion` · `DELETE /api/sesion` | Iniciar y cerrar sesión |
| `POST /api/cuenta/contrasena` | Cambiar la contraseña propia |
| `GET /api/salud` | Comprobación de la base de datos |
| `GET` · `PATCH /api/perfil` | Leer y guardar el perfil (multipart, con logo) |
| `GET /api/carta` | Borrador completo, con el estado de publicación |
| `POST /api/carta/secciones` · `PATCH` · `DELETE /api/carta/secciones/{id}` · `POST /api/carta/secciones/{id}/mover` | Secciones |
| `POST /api/carta/productos` · `PATCH` · `DELETE /api/carta/productos/{id}` · `POST /api/carta/productos/{id}/mover` | Productos (incluye variantes y adicionales) |
| `PUT` · `DELETE /api/carta/productos/{id}/imagen` | Imagen del producto |
| `PUT /api/carta/plantilla` | Plantilla elegida |
| `POST /api/carta/publicar` | Publicar el borrador |
| `GET /api/qr` · `GET /api/qr/png` · `GET /api/qr/svg` | QR (genera una sola vez) y descargas |
| `POST /api/digitalizacion` · `PUT /api/digitalizacion/{id}/fotos/{n}` · `GET /api/digitalizacion/{id}` · `GET /api/digitalizacion/activa` | Trabajos de digitalización |
| `POST /api/vistas/{slug}` | Registrar una visita a la carta pública |
| `GET /api/estadisticas` | Estadísticas del restaurante del dueño |
| `GET /api/admin/restaurantes` · `PATCH` · `DELETE /api/admin/restaurantes/{id}` · `POST /api/admin/restaurantes/{id}/contrasena-temporal` | Backoffice |

**Funciones de Netlify**

- `netlify/functions/digitize-background.mts`: Background Function. La invoca el navegador del dueño; ver E10.
- `netlify/functions/maintenance.mts`: función programada diaria; ver E10 y E11.

**Slugs reservados** (nunca se asignan a un restaurante): `admin`, `api`, `assets`, `auth`, `backoffice`, `cuenta`, `entrar`, `favicon`, `favicon-ico`, `health`, `login`, `logout`, `media`, `next`, `panel`, `register`, `registro`, `robots`, `robots-txt`, `salir`, `sitemap`, `sitemap-xml`, `static`, `uploads`.

### E2. Arquitectura en Netlify

- Los Server Components leen la base de datos directamente con módulos de `src/server/`. Los Client Components llaman a los Route Handlers.
- Las rutas `/panel/*` y `/admin/*` se protegen en sus `layout.tsx` de servidor: leen la sesión y redirigen a `/entrar` si no hay sesión o el rol no corresponde. Los Route Handlers vuelven a autorizar por su cuenta. No hace falta middleware.
- Estructura:

| Carpeta | Contenido |
|---|---|
| `src/app/` | Páginas y Route Handlers |
| `src/components/ui/` | Primitivas del diseño (Button, Field, Card, Notice, StatusPill…) |
| `src/shared/` | Funciones puras para cliente y servidor: validación, slug, precios, snapshot de la carta, estadísticas |
| `src/server/` | Solo servidor: acceso a datos, sesiones, servicios. Imports relativos |
| `db/schema.ts` · `db/index.ts` | Esquema y cliente Drizzle |
| `netlify/database/migrations/` | Migraciones SQL generadas con `drizzle-kit generate` |
| `netlify/functions/` | Background y Scheduled Functions |

- **Caché de la carta pública**: se cachea por slug con la etiqueta `menu:{slug}`, con la API de caché por etiquetas que documente la versión instalada de Next (`'use cache'` + `cacheTag`, o `unstable_cache`). Se invalida con `revalidateTag` al publicar, al guardar el perfil, al cambiar de plantilla, al pausar o reactivar el restaurante y al eliminarlo. Así casi todas las visitas no ejecutan funciones.

### E3. Modelo de datos (Postgres)

Todas las tablas usan `id uuid` como clave primaria (`gen_random_uuid()`), y `created_at` / `updated_at` `timestamptz` cuando aplica.

**Enums:** `account_role` (`OWNER`, `ADMIN`) · `restaurant_status` (`ENABLED`, `DISABLED`) · `menu_template` (`ORIGINAL`, `TRADITIONAL`, `CASUAL`, `PREMIUM`) · `category_layout` (`LIST`, `CARDS`) · `digitization_status` (`UPLOADING`, `PROCESSING`, `SUCCEEDED`, `FAILED`).

**`accounts`**: `email varchar(320)` único, guardado en minúsculas y sin espacios · `password_hash varchar(255)` · `role account_role` · `must_change_password boolean default false` · `is_active boolean default true`.

**`sessions`**: `account_id` → `accounts` (on delete cascade) · `token_digest char(64)` único (SHA-256 hex del token) · `expires_at timestamptz` · `revoked_at timestamptz null` · `last_used_at timestamptz`. Índice en (`account_id`, `revoked_at`, `expires_at`).

**`restaurants`**:

- `owner_account_id` → `accounts`, **único** (un restaurante por cuenta), on delete cascade.
- `slug varchar(160)` único, inmutable · `name varchar(160)` · `logo_key varchar(512) null`.
- `contact_phone varchar(32)` · `whatsapp varchar(32)` · `address varchar(500)` · `instagram_url`, `facebook_url`, `tiktok_url` `varchar(2048)` (todos null por defecto).
- `source_style jsonb null`: el estilo detectado por la digitalización, `{ backgroundColor, textColor, fontFamily }`.
- `menu_template menu_template default 'ORIGINAL'`.
- `published_menu jsonb null` · `published_at timestamptz null`.
- `status restaurant_status default 'ENABLED'`.
- `qr_payload varchar(2048) null` · `qr_png bytea null` · `qr_svg text null`.
- Índice en `status`.

**`categories`**: `restaurant_id` → `restaurants` (cascade) · `name varchar(160)` · `layout category_layout default 'LIST'` · `sort_order integer`. Único (`id`, `restaurant_id`). Índice (`restaurant_id`, `sort_order`).

**`products`**:

- `restaurant_id` → `restaurants` (cascade) · `category_id` · `name varchar(200)` · `description text null` (máx. 2000) · `base_price numeric(10,2)` · `image_key varchar(512) null` · `is_available boolean default true` · `sort_order integer`.
- **FK compuesta** (`category_id`, `restaurant_id`) → `categories` (`id`, `restaurant_id`), on delete cascade.
- Único (`id`, `restaurant_id`). Índice (`restaurant_id`, `category_id`, `sort_order`).

**`product_variants`** y **`product_extras`** (iguales): `restaurant_id` → `restaurants` (cascade) · `product_id` · `name varchar(160)` · `price numeric(10,2)` · `sort_order integer`. **FK compuesta** (`product_id`, `restaurant_id`) → `products` (`id`, `restaurant_id`), cascade. Índice (`restaurant_id`, `product_id`, `sort_order`).

**`digitization_jobs`**: `restaurant_id` → `restaurants` (cascade) · `status digitization_status` · `photo_keys jsonb default '[]'` · `error_code varchar(64) null` · `started_at` · `finished_at` `timestamptz null`. **Índice único parcial** en `restaurant_id` `WHERE status IN ('UPLOADING','PROCESSING')`: un solo trabajo activo por restaurante.

**`view_events`**: `restaurant_id` → `restaurants` (cascade) · `viewed_at timestamptz` · `view_date date` (fecha de Lima) · `view_hour smallint` (0–23, hora de Lima) · `visitor_hash varchar(64)`. Único (`restaurant_id`, `view_date`, `visitor_hash`). Índice (`restaurant_id`, `view_date`, `view_hour`).

**`view_summaries`**: `restaurant_id` → `restaurants` (cascade) · `summary_date date` · `view_hour smallint` · `view_count integer`. Único (`restaurant_id`, `summary_date`, `view_hour`).

### E4. Cuentas, sesiones y autorización

- **Contraseñas**: Argon2id con `@node-rs/argon2` (memoryCost 19456 KiB, timeCost 2, parallelism 1). Añádelo a `serverExternalPackages` en `next.config`. Si el binario nativo falla en Netlify, usa `hash-wasm` (argon2id con los mismos parámetros) y anótalo en PROGRESS.md.
- **Sesión**: token aleatorio de 32 bytes en base64url, en la cookie `sirio_session` (HttpOnly, Secure, SameSite=Lax, Path=/, 7 días). En la base de datos solo se guarda su SHA-256. Se renueva otros 7 días si le quedan menos de 3. Se revoca al cerrar sesión, al cambiar la contraseña (todas las sesiones menos la actual) y al poner una contraseña temporal (todas).
- **Lectura de la sesión**: una sola función de `src/server/` recibe la cabecera `Cookie` y devuelve la cuenta (o null). La usan los layouts, los Route Handlers y la Background Function.
- **Registro** (`POST /api/registro`), dentro de una transacción con `pg_advisory_xact_lock` para que dos registros simultáneos no creen dos administradores:
  - Si no existe ninguna cuenta: crea un `ADMIN` con correo y contraseña. No crea restaurante.
  - Si ya existe alguna: crea un `OWNER` y su restaurante. El slug sale del nombre (E5), y se resuelven las colisiones con `-2`, `-3`… dentro de la misma transacción.
  - Correo repetido: 409, «Ya existe una cuenta con ese correo.».
  - Al terminar inicia la sesión y redirige a `/admin` o `/panel`.
- **Inicio de sesión**: el error es siempre genérico, «Correo o contraseña incorrectos.». Una cuenta con `is_active = false` no entra. Un dueño cuyo restaurante está pausado sí entra, y el panel muestra el aviso «Tu carta está pausada por el administrador. Los clientes no pueden verla.».
- **`must_change_password`**: mientras esté activo, todas las páginas redirigen a `/panel/cuenta` o `/admin/cuenta`, y las APIs (salvo cambiar la contraseña y cerrar sesión) responden 403 con el código `MUST_CHANGE_PASSWORD`.
- **«¿Olvidaste tu contraseña?»** muestra solo el texto «Contacta al administrador de la plataforma.». No se envían correos.
- **Autorización**: `requireOwner()` y `requireAdmin()` en `src/server/`. El restaurante sale de `restaurants.owner_account_id = cuenta.id`.

### E5. Validaciones (compartidas en `src/shared/validation.ts`)

| Dato | Regla |
|---|---|
| Correo | `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, máx. 320 caracteres, en minúsculas |
| Contraseña | 8–128 caracteres y `/^(?=.*\p{Ll})(?=.*\p{Lu})(?=.*\p{Nd})/su` (minúscula, mayúscula y número; «Ñandú2024» es válida). Se exige en el registro, el inicio de sesión, el cambio de contraseña y la temporal |
| Nombre del restaurante | 1–160 caracteres, tras unificar espacios. Debe producir un slug no vacío |
| Slug | NFKD → quitar marcas diacríticas → minúsculas → todo lo que no sea letra o número pasa a `-` → sin guiones en los extremos. Si está reservado (E1) o existe: `-2`, `-3`… |
| Teléfono y WhatsApp | `/^\+?[0-9 ()-]{7,32}$/` |
| Dirección | Máx. 500 caracteres |
| Redes | URL completa `https://` cuyo host sea: Instagram `instagram.com`, `www.instagram.com` · Facebook `facebook.com`, `www.facebook.com`, `fb.com`, `www.fb.com` · TikTok `tiktok.com`, `www.tiktok.com` |
| Sección | Nombre 1–160 |
| Producto | Nombre 1–200 · descripción vacía (null) o 1–2000 |
| Precio | `/^\d{1,8}(?:\.\d{1,2})?$/`, de 0 a 99 999 999,99; se guarda con 2 decimales |
| Variantes y adicionales | Hasta 30 por producto; nombre 1–160 y precio |
| Colores | `#rrggbb` |

**Mensajes de validación (ejemplos):** «Escribe un correo válido, por ejemplo nombre@dominio.com.» · «La contraseña debe tener entre 8 y 128 caracteres, con una mayúscula, una minúscula y un número.» · «Las contraseñas no coinciden.» · «Escribe un precio válido, por ejemplo 18.50.».

Errores de API: JSON `{ "code": "…", "message": "…" }`, con el mensaje en español.

### E6. Archivos (Netlify Blobs)

- **Store** `uploads` (`getStore('uploads')`). Claves:
  - Logo: `restaurants/{restaurantId}/logo/{uuid}`.
  - Imagen de producto: `restaurants/{restaurantId}/products/{productId}/{uuid}`.
  - Foto de digitalización: `digitization/{jobId}/{n}`. Nunca se sirve.
- Se guarda el `contentType` en los metadatos del blob.
- **Validación** en el servidor, por firma binaria:
  - PNG: `89 50 4E 47 0D 0A 1A 0A`.
  - JPEG: `FF D8 FF`.
  - WebP: `RIFF` en los bytes 0–3 y `WEBP` en los bytes 8–11.
- **Límites**: logo ≤ 2 MB; imagen de producto ≤ 4 MB; digitalización de 1 a 5 fotos, ≤ 3 MB cada una y ≤ 12 MB en total.
- **Compresión en el navegador**, con canvas, antes de subir: lado mayor ≤ 1600 px (logo y producto) o ≤ 2000 px (digitalización), JPEG calidad 0,85. Si aún supera el límite, se muestra el error y no se envía.
- **`/media/{...clave}`** sirve solo claves que empiecen por `restaurants/`, con su content-type y `Cache-Control: public, max-age=31536000, immutable` + `Netlify-CDN-Cache-Control: public, max-age=31536000, immutable`. Cualquier otra clave responde 404.
- Al reemplazar o quitar una imagen, el blob anterior se borra **después** de confirmar el cambio en la base de datos.
- Al borrar una sección o un producto se borran las imágenes de sus productos. Al eliminar un restaurante, todos los blobs con prefijo `restaurants/{id}/`.

### E7. Carta: borrador, publicación, plantillas y fuentes

- El **borrador** son las tablas `categories`, `products`, `product_variants` y `product_extras`. La **carta publicada** es `restaurants.published_menu` (snapshot JSON) + `published_at`.
- **Forma del snapshot** (función pura en `src/shared/menu-snapshot.ts`):

```json
{
  "template": "ORIGINAL",
  "style": { "backgroundColor": "#ffffff", "textColor": "#111827", "fontFamily": "Inter" },
  "categories": [
    {
      "id": "uuid", "name": "Entradas", "layout": "LIST",
      "products": [
        {
          "id": "uuid", "name": "Ceviche", "description": null, "basePrice": "28.00",
          "imageKey": null, "isAvailable": true,
          "variants": [{ "id": "uuid", "name": "Personal", "price": "28.00" }],
          "extras": [{ "id": "uuid", "name": "Choclo", "price": "3.00" }]
        }
      ]
    }
  ]
}
```

- **«Cambios por publicar»**: el snapshot del borrador difiere del publicado. Se comparan con las claves ordenadas, así que el orden de las claves no importa. Si nunca se publicó, hay cambios cuando existe al menos un producto disponible.
- **Publicar**: exige al menos un producto disponible; si no, 400 `EMPTY_MENU`, «Agrega al menos un producto disponible antes de publicar.». El snapshot se guarda con un solo `UPDATE` y se invalida `menu:{slug}`.
- **Orden**: botones «Subir» y «Bajar» accesibles, sin arrastrar.
- **Bloqueo**: mientras haya un trabajo de digitalización `UPLOADING` o `PROCESSING`, toda modificación de la carta responde 409 `DIGITIZATION_IN_PROGRESS`, y el editor lo avisa y se deshabilita.
- **Plantillas**:

| Plantilla | Etiqueta | Descripción | Fondo | Texto | Fuente |
|---|---|---|---|---|---|
| `ORIGINAL` | Original detectado | Conserva los colores y la tipografía detectados en tu carta. | `source_style` o `#ffffff` | `source_style` o `#111827` | `source_style` o Inter |
| `TRADITIONAL` | Tradicional | Papel marfil y serif clásica para una carta de mesa. | `#FFF8ED` | `#3D2A20` | Libre Baskerville |
| `CASUAL` | Casual | Claro, cercano y fácil de leer desde el celular. | `#F1F7F0` | `#20382D` | Nunito |
| `PREMIUM` | Premium | Tinta oscura y detalles cálidos para una propuesta más sobria. | `#1D1815` | `#FFF3DD` | Playfair Display |

- **Las 12 fuentes**: Inter, Roboto, Open Sans, Lato, Montserrat, Poppins, Playfair Display, Merriweather, Oswald, Raleway, Nunito, Libre Baskerville. Se cargan con `next/font/google`, con una llamada literal por familia (subsets `latin`, `display: 'swap'`), y se aplican **solo** en la carta pública y en la vista previa de plantillas, nunca en el panel.
- **Diseño por sección**:
  - `LIST`: filas con nombre, descripción y precio a la derecha, y una imagen pequeña opcional.
  - `CARDS`: tarjetas con la imagen arriba, en 1 columna en móvil, 2 desde 640 px y 3 desde 1024 px.

### E8. Carta pública `/{slug}`

- **Estados**:
  - Slug inexistente o restaurante `DISABLED` → `notFound()`, con la página 404 en español «Esta carta no está disponible.».
  - Sin carta publicada → logo, nombre y contacto con el texto «Próximamente: este restaurante está preparando su carta digital.».
  - Con carta publicada → se renderiza el **snapshot publicado**, nunca el borrador.
- **Contenido**:
  - Cabecera con logo, nombre y dirección.
  - Índice de secciones con anclas, solo de las que tienen productos disponibles.
  - Productos disponibles, con nombre, descripción, precio, «Opciones» (variantes) y «Adicionales», con sus precios.
  - Contacto: teléfono (`tel:`), WhatsApp y redes, solo las que empiezan por `https://`.
  - Pie «Carta digital creada con Sirio».
- **WhatsApp**: solo dígitos. Si son 9 y empiezan por 9, se antepone `51`. Se acepta entre 8 y 15 dígitos; si no, se oculta el enlace. Enlace `https://wa.me/{digitos}`.
- **Precio**: `Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })` → «S/ 18.50».
- **Estilo**: variables CSS `--menu-background`, `--menu-foreground` y `--menu-font` tomadas del snapshot. El panel no influye en la carta.
- **Metadatos**: título «{nombre} · Carta digital»; descripción «Carta de {nombre} en {dirección}. Platos, precios y disponibilidad al día.» (sin «en {dirección}» si no hay dirección); Open Graph con `locale: es_PE`.
- **Visitas**: un componente de cliente envía `POST /api/vistas/{slug}` una vez al cargar la página (`keepalive`, ignorando errores). Ver E11.

### E9. Código QR

- Se genera la **primera vez** que el dueño abre `/panel/qr`, solo si los tres campos `qr_*` están vacíos, y después **no se regenera nunca**.
- Contenido: `{PUBLIC_APP_URL sin barra final}/{slug}`. Si falta `PUBLIC_APP_URL`, la página dice «La dirección pública aún no está configurada. Avisa al administrador.» y no genera nada.
- `qrcode`: corrección de errores `H`, margen 4 y ancho 512 px para el PNG; el SVG, con las mismas opciones.
- La pantalla muestra el QR, la URL, «Descargar PNG» y «Descargar SVG» (`Content-Disposition: attachment; filename="qr-{slug}.png"` o `.svg`), «Copiar enlace» y «Abrir carta pública», con la nota: «Este QR no cambia aunque edites tu carta o el nombre del restaurante.».

### E10. Digitalización con IA (Gemini)

**Flujo** (todo desde `/panel/carta`):

1. El dueño elige de 1 a 5 fotos (`accept="image/jpeg,image/png,image/webp"`). Se comprimen en el navegador (E6) y se muestran miniaturas.
2. Si el borrador tiene productos, se pide confirmación: «La carta digitalizada reemplazará todo tu borrador actual. Tu carta publicada no cambia hasta que publiques.».
3. `POST /api/digitalizacion` crea el trabajo en `UPLOADING` (409 si ya hay uno activo) y devuelve su id.
4. `PUT /api/digitalizacion/{id}/fotos/{n}` sube cada foto (n de 1 a 5): se valida la firma y el tamaño, se guarda en Blobs y se añade la clave a `photo_keys`.
5. El **navegador** llama a `POST /.netlify/functions/digitize-background` con `{ "jobId": "…" }`. No lo hace el servidor: el sitio es privado mientras se construye, y una llamada del servidor a su propia URL no pasaría la protección de Netlify.
6. La Background Function (`config.background = true`):
   - Verifica `Origin` y la sesión del dueño desde la cookie.
   - Reclama el trabajo de forma atómica: `UPDATE … SET status='PROCESSING', started_at=now() WHERE id=$1 AND restaurant_id=$2 AND status='UPLOADING' AND jsonb_array_length(photo_keys) BETWEEN 1 AND 5 RETURNING *`. Si no hay fila, termina sin hacer nada.
   - Lee las fotos de Blobs y llama a Gemini.
   - Valida la respuesta y reemplaza el borrador en una transacción: borra las secciones del restaurante (cascada), inserta las nuevas con `layout = 'LIST'`, productos disponibles y sin imágenes, y guarda `source_style`.
   - Marca `SUCCEEDED` y borra, ya fuera de la transacción, los blobs de las imágenes de los productos eliminados.
   - En un `finally`, borra las fotos del trabajo.
   - **Nunca lanza un error hacia fuera**: si falla, marca `FAILED` con su `error_code`, porque Netlify reintenta las Background Functions que fallan.
7. El navegador consulta `GET /api/digitalizacion/{id}` cada 3 s. Muestra «Subiendo fotos…» y luego «Leyendo tu carta con IA (puede tardar hasta 2 minutos)…». Al terminar, recarga el borrador con el aviso «Carta digitalizada. Revísala y publícala cuando esté lista.».
8. Al abrir `/panel/carta`, `GET /api/digitalizacion/activa` retoma el seguimiento si hay un trabajo en curso.

**Llamada a Gemini** (`@google/genai`):

- Cliente: `new GoogleGenAI({ apiKey: SIRIO_GEMINI_API_KEY, httpOptions: { baseUrl: 'https://generativelanguage.googleapis.com', timeout: 120000 } })`. La URL base va explícita para no usar por accidente el AI Gateway de Netlify.
- Modelo: `GEMINI_MODEL`, o `gemini-2.5-flash` si no está definida.
- `contents`: un mensaje `user` con el texto del prompt seguido de cada foto como `inlineData` (base64 y mimeType).
- `config`: `{ responseMimeType: 'application/json', responseJsonSchema: <esquema>, temperature: 0.1 }`.
- Reintentos: hasta 2, ante 408, 429, 5xx o timeout, con espera de `500 ms × 2^intento` + hasta 250 ms aleatorios.

**Prompt** (texto exacto):

```text
Analiza todas las fotografías como páginas de una misma carta de restaurante.
Extrae solo información visible. No inventes productos, precios ni ingredientes. Une categorías repetidas entre páginas.
Los precios deben ser números en soles peruanos, sin símbolo monetario. Si un producto no tiene descripción visible usa null.
"variants" son presentaciones o tamaños con precio propio; "extras" son adicionales opcionales con precio propio.
Estima el color de fondo, el color principal del texto y la familia de Google Fonts más cercana al diseño.
Devuelve únicamente el objeto que cumple el esquema estructurado.
```

**Esquema de respuesta** (JSON Schema):

```json
{
  "type": "object", "additionalProperties": false, "required": ["categories", "style"],
  "properties": {
    "categories": { "type": "array", "items": {
      "type": "object", "additionalProperties": false, "required": ["name", "products"],
      "properties": {
        "name": { "type": "string" },
        "products": { "type": "array", "items": {
          "type": "object", "additionalProperties": false,
          "required": ["name", "description", "basePrice", "variants", "extras"],
          "properties": {
            "name": { "type": "string" },
            "description": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
            "basePrice": { "type": "number" },
            "variants": { "type": "array", "items": { "$ref": "#/$defs/pricedItem" } },
            "extras": { "type": "array", "items": { "$ref": "#/$defs/pricedItem" } }
          } } }
      } } },
    "style": { "type": "object", "additionalProperties": false,
      "required": ["backgroundColor", "textColor", "fontFamily"],
      "properties": {
        "backgroundColor": { "type": "string" },
        "textColor": { "type": "string" },
        "fontFamily": { "type": "string", "enum": ["Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Playfair Display", "Merriweather", "Oswald", "Raleway", "Nunito", "Libre Baskerville"] }
      } }
  },
  "$defs": { "pricedItem": { "type": "object", "additionalProperties": false, "required": ["name", "price"],
    "properties": { "name": { "type": "string" }, "price": { "type": "number" } } } }
}
```

Si Gemini rechaza `$ref`, se repite `pricedItem` en línea en `variants` y `extras`.

**Validación de la respuesta** (función pura `parseExtractedMenu`):

- Entre 1 y 50 secciones, y entre 1 y 500 productos en total.
- Cada sección, entre 1 y 100 productos. Cada producto, hasta 30 variantes y 30 adicionales.
- Textos: espacios unificados y longitudes de E5.
- Precios: números finitos entre 0 y 99 999 999,99, guardados con 2 decimales.
- Colores: `#rrggbb` en minúsculas; si no lo son, `#ffffff` y `#111827`. Si el contraste del texto contra el fondo es menor que 4,5, se usa negro o blanco, el que contraste más.
- Fuente: una de las 12; si no, Inter.

**Errores**:

| Código | Mensaje |
|---|---|
| `MODEL_TIMEOUT` | Gemini tardó demasiado en responder. Inténtalo nuevamente. |
| `MODEL_UNAVAILABLE` | Gemini no está disponible temporalmente. Inténtalo en unos minutos. |
| `MODEL_CONFIGURATION_ERROR` | Gemini no está configurado correctamente. Contacta al administrador. |
| `INVALID_MODEL_RESPONSE` | Gemini no pudo interpretar una carta válida. Prueba con fotos más nítidas. |

Ante un fallo se ofrece «Volver a intentar»: hay que elegir las fotos otra vez, porque ya se borraron.

**Mantenimiento** (`maintenance.mts`, `schedule: '15 9 * * *'`, es decir, 04:15 en Lima):

- Los trabajos en `PROCESSING` con más de 20 min, o en `UPLOADING` con más de 60 min, pasan a `FAILED` y se borran sus fotos.
- Trabaja en lotes y se detiene a los 20 s, porque estas funciones tienen un límite de 30 s.

### E11. Estadísticas de visitas

- **Visita única** = restaurante + fecha de Lima + `visitor_hash`, donde `visitor_hash = HMAC-SHA256(ip, VIEW_HASH_SECRET)` en hex.
  - IP: la cabecera `x-nf-client-connection-ip`, o si falta, la primera dirección de `x-forwarded-for`, sin el prefijo `::ffff:`.
  - Se inserta con `ON CONFLICT DO NOTHING` y solo si el restaurante está `ENABLED`.
  - `POST /api/vistas/{slug}` siempre responde 204.
- **Hora de Lima**: UTC−5 fijo, sin horario de verano. `view_date` y `view_hour` se calculan con esa hora.
- **Cálculo** (función pura `calculateViewStatistics(buckets, hoy)`, donde cada bucket es `{ date, hour, viewCount }` y viene de `view_events` agrupados más `view_summaries`):
  - `last7Days`: fechas ≥ hoy − 6. `last30Days`: fechas ≥ hoy − 29. `allTime`: todas.
  - Por hora (0–23): total, y promedio = total ÷ días desde la primera fecha con datos hasta hoy, ambos incluidos.
  - Por día de la semana (0 = domingo): total, y promedio = total ÷ veces que ese día cae en ese rango.
  - Promedios redondeados a 1 decimal.
- **Pantalla**:
  - Tres cifras: «Últimos 7 días», «Últimos 30 días» y «Desde el inicio».
  - La frase «El mayor movimiento llega los {día} a las {HH:00}.».
  - Barras por hora (24 h, «15:00»), con desplazamiento horizontal en móvil, y barras por día de la semana (lunes primero).
  - Estado vacío: «Aún no hay visitas. Comparte tu QR para empezar a medir.».
- **Retención** (en `maintenance.mts`): los eventos con más de 30 días se consolidan en `view_summaries` (suma por restaurante, fecha y hora) y se borran, por lotes y dentro del límite de tiempo.

### E12. Backoffice

- `/admin` lista los restaurantes con nombre, slug, correo del dueño, estado y fecha de alta. Busca por nombre, slug o correo, con 20 por página.
- **Pausar y reactivar**: cambia `status` e invalida `menu:{slug}`.
- **Eliminar**: hay que escribir exactamente `ELIMINAR {slug}` y marcar «Entiendo que se borrará para siempre». Borra los blobs del restaurante, luego la cuenta del dueño (en cascada, su restaurante y sus datos), e invalida la caché.
- **Contraseña temporal**: genera 12 caracteres con `crypto.randomInt` que cumplen la política de E5. Se muestran **una sola vez**, con un botón para copiarlos. Activa `must_change_password` y revoca todas las sesiones del dueño.
- La cuenta de administrador no aparece en la lista y no se puede pausar ni eliminar.

### E13. Textos clave de la interfaz

| Lugar | Texto |
|---|---|
| `/entrar` | Título «Entra a tu panel» · botón «Entrar» · enlace «Crear cuenta» · «¿Olvidaste tu contraseña? Contacta al administrador de la plataforma.» |
| `/registro` (administrador) | «Crear la cuenta de administrador» · «Esta será la única cuenta con acceso al backoffice.» |
| `/registro` (dueño) | «Crea la carta digital de tu restaurante» · campos «Nombre del restaurante», «Correo», «Contraseña», «Repite la contraseña» · botón «Crear cuenta» |
| Navegación del panel | Perfil · Carta · QR · Estadísticas · Cuenta · Salir |
| Perfil guardado | «Perfil guardado.» |
| Carta | «Tienes cambios por publicar.» · «Publicar carta» · «Ver carta pública» · «Tu carta está publicada y al día.» |
| Producto no disponible | Pastilla «No disponible» |
| Error genérico | «No pudimos completar la acción. Inténtalo de nuevo.» |

---

## 7. Fases

Cada fase es **una ejecución nueva** en modo Build, que se revisa en el Deploy Preview y se publica antes de seguir (sección 4).

| # | Fase | Costo |
|---|---|---|
| 1 | Esqueleto, reglas y diseño base | Medio |
| 2 | Base de datos | Bajo |
| 3 | Cuentas, registro e inicio de sesión | Alto |
| 4 | Perfil del restaurante y QR | Medio |
| 5 | Editor: secciones y productos | Medio |
| 6 | Editor: variantes, adicionales e imágenes | Medio |
| 7 | Publicación y carta pública | Alto |
| 8 | Plantillas y fuentes | Bajo |
| 9 | Digitalización I: subida y seguimiento (con extractor simulado) | Medio |
| 10 | Digitalización II: Gemini real | Alto |
| 11 | Estadísticas de visitas | Medio |
| 12 | Backoffice | Medio |
| 13 | Revisión final y apertura | Medio |

### Fase 1 — Esqueleto, reglas y diseño base

**Prompt** (adjunta este `plan.md`):

```text
Fase 1 de 13 del plan adjunto (plan.md). Construimos la versión para Netlify del sistema de cartas digitales Sirio, sin landing page.

1. Crea un proyecto Next.js (última versión estable, App Router, TypeScript strict, Tailwind CSS, ESLint) desplegable en Netlify con su adaptador oficial, sin fijar la versión del adaptador.
2. Crea CLAUDE.md copiando LITERALMENTE el bloque de la sección 5 de plan.md. Crea docs/ESPECIFICACION.md copiando LITERALMENTE las secciones E1 a E13 de la sección 6. No resumas ni cambies nada.
3. Crea PROGRESS.md con estos apartados: «Fase actual», «Fases completadas», «Decisiones», «Pendientes», «Cómo verificar».
4. Crea la estructura de carpetas de E2 (src/components/ui, src/shared, src/server, db, netlify/functions). Déjalas vacías salvo lo que pide esta fase.
5. Configura Vitest e implementa src/shared/slug.ts (normalizeSlug, isReservedSlug y resolveUniqueSlug con una función de existencia inyectada) según E1 y E5, con pruebas: «Cevichería Luna» → «cevicheria-luna»; «¡¡Hola!!» → «hola»; «admin» reservado → «admin-2»; «---» da error; colisión «luna» → «luna-2» → «luna-3».
6. Diseño del PANEL (no de la carta pública): propone un sistema visual propio para dueños de restaurantes que trabajan desde el celular. Tokens CSS (colores, tipografía, radios, espaciado, sombras) en el CSS global; solo tema claro; contraste AA; controles de al menos 44 px. Primitivas en src/components/ui: Button (primario, secundario, peligro), Field (label + control + ayuda + error), Card, Notice (éxito y error) y StatusPill.
7. Páginas: «/» redirige a /entrar. /entrar y /registro (formulario de dueño de E13) como maquetas sin lógica, ya con el diseño. Página 404 en español.
8. Scripts npm: dev, build, lint, typecheck (tsc --noEmit) y test (vitest run).
9. Ejecuta lint, typecheck y test una vez al final y anota el resultado en PROGRESS.md.
```

**Revisa en el Deploy Preview:**
- [ ] `/` lleva a `/entrar`.
- [ ] `/entrar` y `/registro` se ven bien en el celular (sin desplazamiento horizontal) y en escritorio.
- [ ] Una ruta inventada muestra la 404 en español.
- [ ] El resumen de la ejecución lista `CLAUDE.md`, `docs/ESPECIFICACION.md`, `PROGRESS.md` y las pruebas de slug en verde.

**Después de publicar:** los pasos de la sección 2 (renombrar, hacer privado y variables de entorno).

### Fase 2 — Base de datos

**Prompt:**

```text
Fase 2 de 13. Lee CLAUDE.md, PROGRESS.md y docs/ESPECIFICACION.md §E2 y §E3.

1. Instala @netlify/database, drizzle-orm@beta y drizzle-kit@beta (dev).
2. Crea drizzle.config.ts con dialect postgresql, schema ./db/schema.ts y out "netlify/database/migrations".
3. Crea db/schema.ts con TODAS las tablas, enums, índices, únicos y claves foráneas de §E3, incluidas las claves foráneas compuestas (id, restaurant_id) y el índice único parcial de digitization_jobs.
4. Genera la migración con drizzle-kit generate y revisa el SQL (el índice parcial puede requerir SQL manual en la migración). NUNCA ejecutes push ni migrate contra la base alojada.
5. Crea db/index.ts con el cliente drizzle (adaptador drizzle-orm/netlify-db).
6. Implementa GET /api/salud: ejecuta select 1 y responde { "ok": true, "database": "up" }, o 503 { "ok": false } si falla, sin exponer detalles.
7. Ejecuta lint, typecheck y test, y actualiza PROGRESS.md.
```

**Revisa en el Deploy Preview:**
- [ ] `/api/salud` responde `{"ok":true,"database":"up"}`.
- [ ] El resumen menciona la migración creada en `netlify/database/migrations/`.

### Fase 3 — Cuentas, registro e inicio de sesión

**Prompt:**

```text
Fase 3 de 13. Lee CLAUDE.md, PROGRESS.md y docs/ESPECIFICACION.md §E1, §E4, §E5 y §E13.

1. src/shared/validation.ts con las reglas de §E5 que usa esta fase (correo, contraseña y nombre del restaurante), con sus mensajes. Pruebas: «Ñandú2024» válida; «clave» y «CLAVE2024» inválidas; «hola@turestaurante» inválido; «ana@mail.com» válido.
2. src/server/: hash y verificación con Argon2id (§E4, con su alternativa si el binario falla), sesiones (token, digest, cookie sirio_session, renovación y revocación), lectura de la sesión desde la cabecera Cookie, assertSameOrigin, requireOwner y requireAdmin. Pruebas de las partes puras: digest del token y comparación de Origin.
3. POST /api/registro según §E4: transacción con pg_advisory_xact_lock; la primera cuenta es ADMIN sin restaurante; las siguientes son OWNER con su restaurante y un slug único (usa src/shared/slug.ts). Correo repetido → 409.
4. POST /api/sesion (inicio de sesión con error genérico) y DELETE /api/sesion (cerrar sesión).
5. /registro: si no hay cuentas, muestra el formulario de administrador; si las hay, el de dueño (§E13). /entrar funcional. Las dos validan con las reglas compartidas al enviar y quitan el error al corregir.
6. Layouts de /panel y /admin que exigen sesión y rol, y redirigen a /entrar si no se cumplen. Navegación del panel (§E13), con «Salir» que cierra la sesión.
7. /panel/cuenta y /admin/cuenta con cambio de contraseña: contraseña actual, nueva y repetida; POST /api/cuenta/contrasena revoca las demás sesiones. Lógica de must_change_password según §E4.
8. /panel y /admin como páginas provisionales: muestran el nombre del restaurante (dueño) o «Backoffice» (administrador).
9. Ejecuta lint, typecheck y test, y actualiza PROGRESS.md.
```

**Revisa en el Deploy Preview** (su base de datos empieza vacía):
- [ ] `/registro` muestra «Crear la cuenta de administrador». Regístrate y llegas a `/admin`.
- [ ] Sal. `/registro` ahora muestra el formulario de dueño. Registra «Cevichería Luna» y llegas a `/panel`, que muestra el nombre.
- [ ] `hola@turestaurante` no se envía y muestra el mensaje de correo. `clave` muestra el de contraseña. Un correo ya usado muestra «Ya existe una cuenta con ese correo.».
- [ ] Sin sesión, `/panel` y `/admin` llevan a `/entrar`. El dueño no entra a `/admin` y el administrador no entra a `/panel`.
- [ ] Una contraseña incorrecta muestra «Correo o contraseña incorrectos.».
- [ ] Cambia la contraseña: la antigua deja de funcionar y la nueva entra.

**Después de publicar:** abre **producción** (privada, solo tú la ves), entra a `/registro` y **crea tu cuenta de administrador de inmediato**: la primera cuenta registrada es la de administrador.

### Fase 4 — Perfil del restaurante y QR

> Requiere `PUBLIC_APP_URL` configurada y un Publish posterior a configurarla.

**Prompt:**

```text
Fase 4 de 13. Lee CLAUDE.md, PROGRESS.md y docs/ESPECIFICACION.md §E5, §E6, §E9 y §E13.

1. src/shared/: detección de la firma de imagen (PNG, JPEG, WebP), validación de teléfono y WhatsApp, validación de las URLs de redes por host y armado del contenido del QR (quitando la barra final). Pruebas de cada una, incluido un archivo de texto renombrado a .png, que debe rechazarse.
2. src/server/blobs: guardar, leer y borrar en el store «uploads» con las claves de §E6.
3. Utilidad de cliente para comprimir imágenes con canvas (§E6).
4. GET y PATCH /api/perfil (multipart): nombre (editable; el slug no cambia), logo (≤2 MB, firma, reemplazo con borrado del anterior después del commit), teléfono, WhatsApp, dirección y redes. Errores en JSON con code y message.
5. Ruta /media/[...key] según §E6.
6. Página /panel con el formulario de perfil: vista previa del logo; el slug y la URL pública en solo lectura, con un enlace «Ver carta pública» (todavía sin contenido); aviso «Perfil guardado.».
7. QR según §E9: GET /api/qr (genera una sola vez y devuelve la URL y el SVG), GET /api/qr/png y /api/qr/svg como descargas, y la página /panel/qr con «Copiar enlace».
8. Ejecuta lint, typecheck y test, y actualiza PROGRESS.md.
```

**Revisa en el Deploy Preview** (registra un dueño de prueba en el preview):
- [ ] Guardas teléfono, WhatsApp, dirección e Instagram, recargas y siguen ahí. `http://instagram.com/x` o `https://evil.com/instagram.com` se rechazan.
- [ ] Un logo de más de 2 MB se comprime o se rechaza con un mensaje. Un `.txt` renombrado a `.png` se rechaza. Un logo válido se ve en el perfil.
- [ ] Cambias el nombre del restaurante y el slug que se muestra no cambia.
- [ ] `/panel/qr` muestra un QR con `https://<tu-subdominio>.netlify.app/<slug>`. Las dos descargas funcionan. Al recargar, el QR es el mismo.

### Fase 5 — Editor: secciones y productos

**Prompt:**

```text
Fase 5 de 13. Lee CLAUDE.md, PROGRESS.md y docs/ESPECIFICACION.md §E5, §E7 y §E13.

1. src/shared/: normalización de textos y precios (§E5) y una función pura que reordena (mueve un elemento arriba o abajo y renumera sort_order). Pruebas: precios «18.5» → «18.50», «abc» y «-1» inválidos; reordenar en los extremos no hace nada.
2. Ayudante de servidor assertNoActiveDigitization(restaurantId), que responde 409 DIGITIZATION_IN_PROGRESS (§E7). Úsalo en toda modificación de la carta.
3. GET /api/carta (borrador ordenado). Secciones: crear, renombrar, cambiar layout LIST/CARDS, eliminar (la confirmación indica cuántos productos se borran) y mover arriba o abajo. Productos: crear dentro de una sección, editar nombre, descripción y precio base, marcar disponible o no, mover a otra sección, subir o bajar, y eliminar. Cada consulta filtra por el restaurant_id del dueño (404 si no le pertenece).
4. Página /panel/carta: lista de secciones con sus productos, formularios de alta y edición, botones «Subir» y «Bajar» accesibles, pastilla «No disponible», precios mostrados como «S/ 18.50», y estado vacío «Tu carta está vacía. Crea tu primera sección o digitaliza tu carta desde fotos.» (el botón de digitalizar llegará en la fase 9).
5. Ejecuta lint, typecheck y test, y actualiza PROGRESS.md.
```

**Revisa en el Deploy Preview:**
- [ ] Creas 2 secciones y 3 productos, los reordenas y, al recargar, el orden se mantiene.
- [ ] Mueves un producto a otra sección, lo editas y lo marcas «No disponible».
- [ ] El precio `abc` muestra el error de precio. `18.5` se guarda como `S/ 18.50`.
- [ ] Al eliminar una sección con productos, la confirmación dice cuántos productos se borran.

### Fase 6 — Editor: variantes, adicionales e imágenes de producto

**Prompt:**

```text
Fase 6 de 13. Lee CLAUDE.md, PROGRESS.md y docs/ESPECIFICACION.md §E5, §E6 y §E7.

1. Variantes y adicionales: dentro del formulario del producto, listas editables (añadir, quitar y ordenar), cada una con nombre y precio, hasta 30. El PATCH del producto los reemplaza en una transacción. Pruebas de la validación de la lista: 31 elementos se rechaza; un nombre vacío se rechaza.
2. Imagen del producto: PUT y DELETE /api/carta/productos/{id}/imagen (≤4 MB, firma, compresión en el navegador, blob con la clave de §E6, borrado del blob anterior después del commit). Al borrar un producto o una sección, se borran también sus imágenes.
3. La interfaz muestra la miniatura y los botones «Cambiar imagen» y «Quitar imagen».
4. Ejecuta lint, typecheck y test, y actualiza PROGRESS.md.
```

**Revisa en el Deploy Preview:**
- [ ] Un producto con 2 variantes y 1 adicional se guarda y, al recargar, sigue igual.
- [ ] Subes una foto de producto desde el celular y se ve la miniatura. La quitas y desaparece.
- [ ] Borras un producto con imagen y no da error.

### Fase 7 — Publicación y carta pública

**Prompt:**

```text
Fase 7 de 13. Lee CLAUDE.md, PROGRESS.md y docs/ESPECIFICACION.md §E2 (caché), §E7 y §E8.

1. src/shared/menu-snapshot.ts: construir el snapshot del borrador (con template y el estilo resuelto: por ahora ORIGINAL con source_style o los valores por defecto), comparar snapshots con las claves ordenadas, filtrar la vista pública (sin productos no disponibles ni secciones vacías), formatear precios en PEN y normalizar el WhatsApp. Pruebas de cada función, incluida la comparación con las claves en otro orden.
2. POST /api/carta/publicar según §E7 (EMPTY_MENU) e invalidación de menu:{slug}. GET /api/carta incluye hasUnpublishedChanges y publishedAt.
3. Barra de publicación en /panel/carta: «Tienes cambios por publicar.» o «Tu carta está publicada y al día.», el botón «Publicar carta» con confirmación y «Ver carta pública».
4. Carta pública /[slug] según §E8: estados 404, «Próximamente» y publicada; layouts LIST y CARDS; índice de secciones; contacto; metadatos; variables CSS del estilo. Cacheada con la etiqueta menu:{slug} (§E2).
5. Guardar el perfil también invalida menu:{slug}.
6. Ejecuta lint, typecheck y test, y actualiza PROGRESS.md.
```

**Revisa en el Deploy Preview:**
- [ ] Antes de publicar, `/<slug>` muestra «Próximamente».
- [ ] Publicas y la carta aparece con precios «S/ 18.50», variantes, adicionales e imágenes.
- [ ] Cambias un precio en el editor: aparece «Tienes cambios por publicar.» y la carta pública **no** cambia hasta publicar.
- [ ] Un producto «No disponible» no aparece. Una sección sin productos disponibles no sale en el índice.
- [ ] Una sección en CARDS se ve en tarjetas (1 columna en el celular).
- [ ] El enlace de WhatsApp abre `wa.me/51…`. Un slug inventado da la 404.

### Fase 8 — Plantillas y fuentes

**Prompt:**

```text
Fase 8 de 13. Lee CLAUDE.md, PROGRESS.md y docs/ESPECIFICACION.md §E7 y §E8.

1. src/shared/: resolveTemplateStyle(template, sourceStyle) con la tabla de §E7, y el contraste mínimo de 4,5 para ORIGINAL. Pruebas por plantilla.
2. Las 12 fuentes con next/font/google, con llamadas literales (una por familia) en un módulo que solo importa la carta pública y la vista previa. Comprueba que el panel no las carga.
3. PUT /api/carta/plantilla. El snapshot incluye la plantilla y el estilo resuelto, así que cambiar de plantilla marca «Tienes cambios por publicar.».
4. Selector de plantillas en /panel/carta: 4 tarjetas con la etiqueta, la descripción y una muestra (fondo, color de texto y el nombre del restaurante en la fuente de la plantilla). La elegida queda marcada.
5. Ejecuta lint, typecheck y test, y actualiza PROGRESS.md.
```

**Revisa en el Deploy Preview:**
- [ ] Eliges «Premium», se marcan cambios por publicar y, al publicar, la carta queda oscura con Playfair Display.
- [ ] «Tradicional» y «Casual» cambian colores y fuente. «Original detectado» vuelve al estilo por defecto.
- [ ] El panel no cambia de aspecto con la plantilla.

### Fase 9 — Digitalización I: subida y seguimiento (con extractor simulado)

**Prompt:**

```text
Fase 9 de 13. Lee CLAUDE.md, PROGRESS.md y docs/ESPECIFICACION.md §E6 y §E10.

Implementa todo el flujo de §E10 SIN Gemini todavía: el extractor es un módulo intercambiable (interfaz MenuExtractor) y en esta fase usa un extractor simulado que espera 5 s y devuelve una carta de ejemplo fija (2 secciones y 5 productos, uno con variantes) que pasa por parseExtractedMenu.

1. src/shared/parse-extracted-menu.ts con TODAS las reglas de validación de §E10 y sus pruebas (válida; precio negativo; 51 secciones; color inválido → valores por defecto; texto sin contraste → negro o blanco; fuente desconocida → Inter).
2. APIs: POST /api/digitalizacion, PUT /api/digitalizacion/{id}/fotos/{n}, GET /api/digitalizacion/{id} y GET /api/digitalizacion/activa (§E10).
3. netlify/functions/digitize-background.mts (background) según §E10: Origin, sesión desde la cookie, reclamo atómico, reemplazo del borrador en una transacción, source_style, borrado de imágenes viejas y de fotos, y FAILED con su código sin lanzar errores hacia fuera.
4. netlify/functions/maintenance.mts (programada a las 9:15 UTC) con la limpieza de trabajos de §E10, por lotes y con corte a los 20 s.
5. Interfaz en /panel/carta: botón «Digitalizar desde fotos», selección de 1 a 5 fotos con miniaturas y tamaño, la confirmación de reemplazo, la subida, la llamada del navegador a /.netlify/functions/digitize-background, el seguimiento cada 3 s con sus mensajes, el editor bloqueado mientras dura y la recuperación al recargar la página.
6. Ejecuta lint, typecheck y test, y actualiza PROGRESS.md.
```

**Revisa en el Deploy Preview:**
- [ ] Con productos en el borrador, «Digitalizar desde fotos» pide confirmar el reemplazo.
- [ ] Subes 2 fotos desde el celular: «Subiendo fotos…» y después «Leyendo tu carta con IA…». A los ~5 s aparece la carta de ejemplo.
- [ ] Recargas la página a mitad del proceso y el seguimiento continúa.
- [ ] Mientras dura, editar la carta no está disponible.
- [ ] Un archivo que no es imagen, o una sexta foto, se rechaza con un mensaje.
- [ ] La carta publicada no cambió: hay «cambios por publicar».

### Fase 10 — Digitalización II: Gemini real

> Requiere `SIRIO_GEMINI_API_KEY` configurada y un Publish posterior a configurarla.

**Prompt:**

```text
Fase 10 de 13. Lee CLAUDE.md, PROGRESS.md y docs/ESPECIFICACION.md §E10.

1. Implementa GeminiMenuExtractor con @google/genai exactamente como en §E10: clave SIRIO_GEMINI_API_KEY, baseUrl explícita de Google, timeout de 120 s, modelo GEMINI_MODEL o gemini-2.5-flash, el prompt y el esquema tal cual, temperature 0.1, reintentos con espera exponencial y el mapeo de errores a MODEL_TIMEOUT, MODEL_UNAVAILABLE, MODEL_CONFIGURATION_ERROR e INVALID_MODEL_RESPONSE.
2. Sustituye el extractor simulado por este (deja el simulado solo para las pruebas). Si falta la clave, el trabajo termina en FAILED con MODEL_CONFIGURATION_ERROR.
3. Pruebas con fetch simulado: respuesta válida; JSON inválido → INVALID_MODEL_RESPONSE; 429 y después 200 → éxito tras reintentar; 400 → MODEL_CONFIGURATION_ERROR.
4. Si Gemini rechaza $ref en el esquema, repite pricedItem en línea (§E10) y anótalo en PROGRESS.md.
5. Ejecuta lint, typecheck y test, y actualiza PROGRESS.md.
```

**Revisa en el Deploy Preview:**
- [ ] Fotografías una carta real (1 o 2 páginas): en menos de 2 minutos aparecen sus secciones, productos y precios, sin inventos.
- [ ] Con «Original detectado», la carta publicada usa colores parecidos a los de la foto.
- [ ] Una foto sin carta (por ejemplo, una pared) termina con «Gemini no pudo interpretar una carta válida…» y permite volver a intentar.

### Fase 11 — Estadísticas de visitas

> Requiere `VIEW_HASH_SECRET` configurada y un Publish posterior a configurarla.

**Prompt:**

```text
Fase 11 de 13. Lee CLAUDE.md, PROGRESS.md y docs/ESPECIFICACION.md §E8 (visitas) y §E11.

1. src/shared/: hora de Lima (UTC−5 fijo: fecha y hora; sumar días; día de la semana) y calculateViewStatistics de §E11. Pruebas: una visita a las 23:30 hora de Lima cuenta para ese día; totales de 7 y 30 días en el borde; promedios por día de la semana.
2. POST /api/vistas/{slug} según §E11 (HMAC con VIEW_HASH_SECRET, cabecera x-nf-client-connection-ip, ON CONFLICT DO NOTHING, siempre 204) y el componente de cliente que lo llama desde la carta pública.
3. GET /api/estadisticas y la página /panel/estadisticas (§E11): tres cifras, la frase del pico, barras por hora (desplazables en el celular), barras por día de la semana y el estado vacío.
4. En maintenance.mts añade la retención de §E11 (consolidar los eventos de más de 30 días en view_summaries y borrarlos), por lotes y dentro del límite de tiempo.
5. Ejecuta lint, typecheck y test, y actualiza PROGRESS.md.
```

**Revisa en el Deploy Preview:**
- [ ] Sin visitas, se ve el estado vacío.
- [ ] Abres la carta pública desde el celular y desde la computadora: «Últimos 7 días» marca 2. Recargar varias veces no suma más.
- [ ] La barra de la hora actual (hora de Lima) tiene datos.

### Fase 12 — Backoffice

**Prompt:**

```text
Fase 12 de 13. Lee CLAUDE.md, PROGRESS.md y docs/ESPECIFICACION.md §E4 y §E12.

1. GET /api/admin/restaurantes (búsqueda y paginación de 20), PATCH /api/admin/restaurantes/{id} (pausar o reactivar e invalidar menu:{slug}), DELETE /api/admin/restaurantes/{id} (frase ELIMINAR {slug} y casilla; blobs, cuenta en cascada y caché) y POST /api/admin/restaurantes/{id}/contrasena-temporal (§E12). Todas con requireAdmin.
2. Generador de contraseña temporal en src/shared/, con pruebas: 12 caracteres y siempre cumple la política de §E5 (prueba 1000 generaciones).
3. Página /admin: tabla en escritorio y tarjetas en el celular, buscador, paginación, acciones con confirmación, y un diálogo que muestra la contraseña temporal una sola vez con «Copiar».
4. En el panel del dueño, el aviso de restaurante pausado (§E4).
5. Ejecuta lint, typecheck y test, y actualiza PROGRESS.md.
```

**Revisa en el Deploy Preview** (con un administrador y dos dueños de prueba):
- [ ] El buscador encuentra por nombre, slug y correo.
- [ ] Pausas un restaurante: su carta da 404 y su dueño ve el aviso. Lo reactivas y vuelve.
- [ ] Una contraseña temporal permite entrar al dueño, que es llevado a cambiarla. Su contraseña anterior ya no sirve.
- [ ] Eliminar no se habilita sin la frase exacta. Al eliminar, la carta da 404 y su dueño ya no puede entrar.

### Fase 13 — Revisión final y apertura

**Prompt:**

```text
Fase 13 de 13. Lee CLAUDE.md y PROGRESS.md. Revisión final; no añadas funciones nuevas.

1. Seguridad: recorre TODOS los Route Handlers y las dos funciones y confirma que cada uno 1) autentica, 2) verifica el rol, 3) filtra por el restaurant_id de la sesión y 4) comprueba Origin en las modificaciones. Corrige lo que falte y lista el resultado en PROGRESS.md.
2. Accesibilidad: labels, foco visible, controles de 44 px, contraste AA en el panel, y mensajes de error con role="alert".
3. Rendimiento: la carta pública cacheada con menu:{slug}; las fuentes de la carta no se cargan en el panel; /media con caché inmutable.
4. Crea README.md: qué es, variables de entorno, cómo funciona el registro (la primera cuenta es la de administrador), límites conocidos (sin correos, sin antiabuso, Gemini con clave propia) y cómo restablecer contraseñas desde el backoffice.
5. Ejecuta lint, typecheck y test, y deja PROGRESS.md con el estado final.
```

**Revisa en el Deploy Preview:**
- [ ] Recorre de nuevo las checklists de las fases 3, 7, 9 y 12 sobre este preview.
- [ ] El resumen lista la revisión de seguridad sin pendientes.

**Después de publicar:**
1. En producción, entra con tu cuenta de administrador y comprueba que todo funciona.
2. Cuando quieras abrirla al público: *Project configuration → General → Visitor access → Project visibility* → **Public** (o el botón **Make public**).

---

## 8. Si el plan Free no alcanza

Avísame y lo construimos **en local** con Claude Code, siguiendo este mismo plan:

1. Se crea el proyecto en esta máquina con las mismas fases y la misma especificación.
2. Se enlaza al proyecto de Netlify (`netlify link`) y se despliega con `netlify deploy --prod`.
3. Netlify sigue alojando la app, su base de datos y sus archivos.
4. Agent Runners quedaría para cambios pequeños posteriores; `CLAUDE.md` y `docs/ESPECIFICACION.md` ya estarían en el proyecto.

---

## 9. Fuentes

- [Agent Runners — hacer cambios](https://docs.netlify.com/build/build-with-ai/agent-runners/make-changes-with-agent-runners/)
- [Agent Runners — visión general](https://docs.netlify.com/build/build-with-ai/agent-runners/overview/)
- [Sincronizar cambios sin Git (changelog)](https://www.netlify.com/changelog/2026-02-13-sync-changes-with-agent-runners/)
- [Controles de modelo en Agent Runners (changelog)](https://www.netlify.com/changelog/2026-08-06-opencode-agent-runners/)
- [Netlify para agentes de código](https://www.netlify.com/knowledge-base/netlify-for-coding-agents/)
- [Límites de funciones](https://docs.netlify.com/build/functions/configuration/)
- [Background Functions](https://docs.netlify.com/build/functions/background-functions/)
- [Planes con créditos](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/)
- [Precios de las funciones de IA](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/pricing-for-ai-features/)
- [Visibilidad del proyecto](https://docs.netlify.com/manage/security/secure-access-to-sites/project-visibility/)
- [Límite de peticiones](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/)
- [Skills oficiales de Netlify para agentes (Database, Blobs, Functions)](https://github.com/netlify/context-and-tools/tree/main/skills)
