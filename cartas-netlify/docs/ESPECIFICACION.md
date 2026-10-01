# Especificación — Sirio Cartas (versión Netlify)

Copia literal de las secciones E1–E13 de [plan.md](plan.md). Si cambia una decisión, se actualiza aquí y se anota en PROGRESS.md.

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
