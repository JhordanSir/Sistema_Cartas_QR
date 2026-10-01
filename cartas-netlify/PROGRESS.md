# Progreso — Sirio Cartas (versión Netlify)

## Fase actual

Fase 10 de 13 — Digitalización II: Gemini real.

## Fases completadas

1. Esqueleto, reglas y diseño base.
2. Base de datos: esquema Drizzle, migración inicial y `GET /api/salud`.
3. Cuentas: registro, inicio y cierre de sesión, cambio de contraseña, y la barra superior del panel y del backoffice.
4. Perfil del restaurante (logo en Netlify Blobs y `/media`) y código QR.
5. Editor de la carta: secciones y productos, orden, disponibilidad y bloqueo por digitalización.
6. Opciones (variantes), adicionales e imagen de cada producto.
7. Publicación (snapshot) y carta pública `/{slug}` cacheada por etiqueta.
8. Plantillas (Original detectado, Tradicional, Casual y Premium) y las 12 fuentes de la carta.
9. Digitalización completa con el extractor simulado: subida, Background Function, seguimiento, bloqueo y mantenimiento.

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

### Cuentas y sesiones (fase 3)

- **Argon2id con `hash-wasm` en lugar de `@node-rs/argon2`.** El despliegue será con la CLI desde esta máquina Windows. El paquete del servidor llevaría el binario nativo de win32, que no corre en las funciones Linux de Netlify. La especificación prevé esta alternativa.
  - Mismos parámetros: m=19456 KiB, t=2, p=1.
  - Los hashes son PHC estándar (`$argon2id$v=19$…`), compatibles con `@node-rs/argon2` si algún día se cambia.
  - Cuesta unos 70 ms por hash o verificación, y no hace falta `serverExternalPackages`.
- **Contraseñas en NFC** antes de hashear y verificar, para que «Ñandú2024» escrita con el acento compuesto o descompuesto sea la misma.
- **Tiempo constante ante correos inexistentes.** El inicio de sesión verifica contra un hash señuelo, así el tiempo de respuesta no revela qué correos tienen cuenta. El error es siempre «Correo o contraseña incorrectos.».
- **Registro.** Lleva un campo `mode` (`admin`/`owner`) que el formulario envía según lo que mostró.
  - Si dos personas abren `/registro` con la base vacía, la segunda recibe 409 `ADMIN_ALREADY_EXISTS`, con un mensaje para recargar, en lugar de un error confuso por el nombre del restaurante.
  - El hash se calcula antes de tomar el bloqueo consultivo, para no retener el bloqueo.
  - La cuenta, el restaurante y la sesión se crean en la misma transacción.
- **Validación compartida.** `src/shared/validation.ts` tiene las reglas de §E5 y `src/shared/account-forms.ts` las de cada formulario. Las usan el navegador al enviar y los Route Handlers con el cuerpo recibido. Las longitudes se cuentan en caracteres, no en unidades UTF-16.
  - Una regla añadida: la contraseña nueva debe ser distinta de la actual. Si no, una contraseña temporal podría «cambiarse» por sí misma.
- **Errores de formulario** (`useFormFields`):
  - Aparecen al enviar, y el foco va al primer campo con error.
  - Se quitan en cuanto el campo se corrige; nunca al salir del campo.
  - Los errores que manda el servidor por campo (por ejemplo, el correo repetido) se quedan hasta que cambia ese campo.
- **Sesión.**
  - Token de 32 bytes en base64url; en la base solo su SHA-256.
  - Cookie `sirio_session` HttpOnly, Secure, SameSite=Lax, de 7 días. Chrome acepta `Secure` en `http://localhost`.
  - La renovación (quedan menos de 3 días → otros 7) ocurre en los Route Handlers, porque los Server Components no pueden escribir cookies. Las páginas solo leen.
- **Autorización.**
  - Los layouts de `/panel` y `/admin` exigen el rol, y cada página lo vuelve a comprobar. La guía de Next 16 advierte que los layouts no se ejecutan en cada navegación, y `cache` deja una consulta por petición.
  - Un dueño que abre `/admin` termina en `/panel`, y al revés, pasando por `/entrar`.
  - `/`, `/entrar` y `/registro` mandan a su panel a quien ya tiene sesión.
- **`must_change_password`.**
  - Las páginas redirigen a `/panel/cuenta` o `/admin/cuenta`, que muestran «Debes cambiar tu contraseña para continuar.».
  - Las APIs responden 403 `MUST_CHANGE_PASSWORD`, salvo cambiar la contraseña y cerrar sesión.
  - Se probará de punta a punta en la fase 12, con la contraseña temporal.
- **Navegación.** Barra superior con una sola lista de enlaces: en línea desde 640 px y plegada tras «Menú» por debajo. El menú se cierra con Escape (el foco vuelve al botón) y al navegar. No se duplica el marcado.
  - Cada sección se añade al menú en la fase que la construye: por ahora el dueño ve Perfil · Cuenta · Salir, y el administrador Restaurantes · Cuenta · Salir.
- **Logs sin secretos.** Drizzle 1.0 adjunta la consulta y sus parámetros a sus errores (hashes, digests). `describeErrorForLog` registra solo el código, la restricción y el mensaje de Postgres.
- **Slug con tope de 150 caracteres.** NFKD puede expandir un carácter en varios (U+FDFA da 18), y el slug con su sufijo debe caber en `varchar(160)`.
- **`tsconfig` con `target: ES2022`.** El regex de contraseña usa los flags `s` y `u` (ES2018). Next compila con SWC, así que solo afecta a la verificación de tipos.
- **Nombres de pruebas en español**, también en las unitarias, como en la fase 1.

### Herramientas (fase 3)

- **Envoltorio de la CLI (`scripts/netlify-cli.ts`).** Con la raíz del repositorio como proyecto, `netlify dev` inyectaba el `.env` del monorepo (secretos JWT, la clave de Gemini y `PUBLIC_APP_URL` de la app principal). Esas variables de proceso ganaban sobre el `.env` de esta carpeta.
  - El flag `--cwd` de la CLI lo corrige, pero solo si el proceso arranca en otra carpeta. El envoltorio lanza la CLI desde la carpeta padre con `--cwd` hacia esta.
  - `pnpm dev:netlify` y `pnpm cli:netlify` lo usan. Ahora `netlify dev` inyecta solo `PUBLIC_APP_URL`, `SIRIO_GEMINI_API_KEY`, `GEMINI_MODEL` y `VIEW_HASH_SECRET`, y guarda todo su estado en `cartas-netlify/.netlify`.
  - Los subcomandos `netlify database …` ignoran `--cwd` y siguen usando la raíz, así que se mantiene `scripts/local-db.ts`.
  - Se borró el `.netlify` que las pruebas habían dejado en la raíz del repositorio.
- **403 → 404 bajo `netlify dev`.** Su proxy reintenta toda respuesta 403/404 del framework como archivo estático (`.html`, `.htm`, `/index.html`) y devuelve el último 404. La prueba del origen ajeno va directo al servidor de Next; en Netlify el 403 llega tal cual.

### Perfil y QR (fase 4)

- **Blobs.** `@netlify/blobs` 11, store `uploads` con consistencia fuerte: un logo debe poder leerse justo después de subirlo.
  - Claves con un UUID nuevo en cada subida (`restaurants/{id}/logo/{uuid}`). Por eso `/media` puede cachear un año con `immutable`.
  - El tipo de contenido viaja en los metadatos del blob.
- **Orden al reemplazar el logo.** Primero se sube el nuevo. Si falla la base de datos, se borra el nuevo; si no, el anterior se borra después del commit. Un borrado fallido solo deja un blob huérfano: se registra y no se lanza.
- **Quitar el logo.** El formulario envía `removeLogo=1`. No estaba explícito en el plan, pero es la contraparte natural de subirlo.
- **Compresión en el navegador solo cuando hace falta.** Un PNG, JPEG o WebP que ya cumple (≤ 2 MB y ≤ 1600 px) se sube tal cual, y así un logo pequeño conserva su transparencia.
  - Lo demás se redibuja en JPEG 0,85, sobre fondo blanco y con la orientación EXIF aplicada.
  - Si aun así supera el límite, no se envía.
  - El servidor vuelve a validar el tamaño y la firma binaria.
- **El guardado espera al logo.** Comprimir una foto grande toma un momento, y guardar antes la dejaba fuera. La E2E lo detectó. El botón queda deshabilitado («Preparando el logo…») mientras tanto.
- **Selector de archivo en español.** El `<input type="file">` nativo muestra «Choose File» en el idioma del navegador. Queda oculto, y un botón «Elegir logo» / «Cambiar logo» lo abre. El botón recibe la ayuda y el error por `aria-describedby`, y el foco cuando hay error.
- **Redes.** Además de §E5 (https y host exacto), se exige una ruta de perfil y se rechazan usuario, contraseña y puerto en la URL.
- **`PUBLIC_APP_URL`.** Se normaliza (http/https, sin query ni hash, sin barra final). Si falta o no es válida, cuenta como no configurada.
- **QR.**
  - Se genera la primera vez que el dueño abre `/panel/qr` o llama a una de las tres APIs del QR.
  - Usa un `UPDATE` condicionado a las tres columnas vacías, así dos primeras visitas simultáneas se quedan con el mismo QR.
  - La página muestra el SVG guardado como `data:` URL.
  - «Abrir carta pública» usa la ruta relativa `/{slug}`, para que funcione también en local, donde el QR apunta al dominio definitivo.
- **`/media/[...key]`.**
  - Patrón estricto de claves: UUIDs en minúscula, solo `logo` o `products/{uuid}`.
  - `X-Content-Type-Options: nosniff`.
  - El 404 va con `no-store`, para que un fallo no quede cacheado.
- **El envoltorio de la CLI corre en el mismo proceso.** Antes lanzaba `netlify-cli` como proceso hijo. Al detener el envoltorio, el hijo seguía sirviendo el puerto 8888, y un nuevo `pnpm dev:netlify` fallaba. Ahora cambia de carpeta, ajusta `process.argv` en el mismo arreglo que lee la CLI e importa su punto de entrada.
- **Next no admite exportaciones auxiliares en `route.ts`.** La parte común de las tres rutas del QR vive en `src/server/next/owner-qr.ts`.
- **Perfil.** El `<h1>` de `/panel` sigue siendo el nombre del restaurante, y la dirección pública aparece en solo lectura con «Ver carta pública».
  - Invalidar `menu:{slug}` al guardar queda para la fase 7, cuando exista esa caché.

### Editor (fase 5)

- **Toda modificación del borrador va en una transacción** (`withMenuEdit`). Primero bloquea la fila del restaurante (`FOR UPDATE`) y luego aplica §E7: con un trabajo de digitalización `UPLOADING` o `PROCESSING`, responde 409 `DIGITIZATION_IN_PROGRESS`.
  - En la fase 9, crear un trabajo debe bloquear la misma fila. Así un trabajo nunca empieza a mitad de una edición.
- **Cada mutación responde el borrador completo y actualizado.** El editor reemplaza su estado con esa respuesta: un solo viaje, y siempre la verdad del servidor.
- **Orden.**
  - Lo nuevo va al final (`max + 1`).
  - «Subir» y «Bajar» renumeran 0, 1, 2… y solo escriben las filas cuyo valor guardado cambia. Tras borrar quedan huecos, y saltar filas por su posición en la lista desordenaba en algunos casos; se corrigió antes de que llegara a una prueba.
  - En los extremos no cambia nada, y en la interfaz el botón está deshabilitado.
- **Cambiar de sección** es parte del `PATCH` del producto (`categoryId`): el producto queda al final de la sección nueva.
- **Ids.** Un id que no es UUID responde el mismo 404 que uno de otro restaurante, sin llegar a Postgres.
- **Precios.** Se normalizan como texto, sin pasar por `float`: «18.5» → «18.50», «007» → «7.00». Se muestran con `Intl` `es-PE` en soles («S/ 18.50»).
- **Diálogos propios sobre `<dialog>` nativo** (`src/components/ui/dialogs.tsx`):
  - `Sheet`: pantalla completa en el celular y columna derecha desde 640 px, con «Cerrar» y Escape. Un clic en el fondo la cierra.
  - `ConfirmDialog`: `role="alertdialog"`, y el foco empieza en «Cancelar».
  - `showModal()` vuelve inerte el resto de la página. Mientras están abiertos, la página no se desplaza.
- **Accesibilidad del editor.**
  - «Subir», «Bajar», «Editar» y «Eliminar» llevan `aria-label` con el nombre del elemento, que contiene el texto visible.
  - Después de mover, el foco vuelve al mismo botón; si llegó al extremo, al contrario.
  - Las secciones son `region` con su `h2`, y los productos son `h3`.
- **Eliminar.** Un producto se elimina desde su hoja de edición, tras confirmar. La sección avisa cuántos productos se borran («También se eliminarán sus 2 productos.»). Las imágenes de los productos borrados se eliminan de Blobs después del commit.
- **404 → 405 bajo `netlify dev`.** Al reintentar un 404 de un POST como archivo estático, la última alternativa termina en 405. La prueba de aislamiento entre restaurantes va directo a Next: la cookie de `localhost` sirve en cualquier puerto.
- **La E2E del bloqueo por digitalización queda para la fase 9**, cuando exista un trabajo real que crear desde la API.

### Opciones, adicionales e imágenes (fase 6)

- **Nombres en la interfaz.** Las variantes se llaman «Opciones» y los extras «Adicionales», como en la carta pública (§E8).
- **Reemplazo en bloque.** El `POST` y el `PATCH` del producto llevan las dos listas completas. En la misma transacción de la edición se borran las anteriores y se insertan las nuevas, con `sort_order` según su posición.
  - Cambiar el producto de sección no rompe las claves foráneas compuestas, porque apuntan a (id, restaurant_id) del mismo restaurante.
- **Validación (§E5).** Hasta 30 por lista, nombre de 1 a 160 caracteres y precio válido.
  - Los errores llegan por fila (`variants.1.price`).
  - En la API las listas aceptan hasta 200 filas para que el límite de 30 responda con su propio mensaje («Puedes agregar hasta 30 opciones.»).
  - En el formulario, «Agregar opción» se deshabilita al llegar a 30.
- **Errores de fila con clave estable.** El formulario guarda los errores por la clave de cada fila, no por su índice. Así siguen a su fila al reordenarla o quitar otra, y se quitan en cuanto esa fila se corrige. El foco va al primer error, en el orden de la pantalla.
- **Etiquetas accesibles por fila.** «Nombre» y «Precio» visibles, y un sufijo solo para lectores de pantalla («de la opción 2», «del adicional 1, en soles»). Por eso `Field` acepta ahora contenido enriquecido como etiqueta.
- **Imagen del producto.**
  - `PUT /api/carta/productos/{id}/imagen` (multipart, campo `image`): ≤ 4 MB, firma binaria y clave `restaurants/{id}/products/{productId}/{uuid}`.
  - Se comprueba que el producto es del dueño antes de subir nada, para no dejar blobs de productos ajenos. El blob anterior se borra después del commit.
  - Se aplica al instante, aparte del formulario, y responde el borrador completo, así la miniatura de la lista se actualiza.
  - Al crear un producto la hoja avisa «Podrás agregar una foto después de crear el producto.»: hace falta su id.
  - Pasa por el mismo bloqueo de §E7 que el resto de la carta.
- **La hoja de edición guarda solo ids.** El producto se toma del borrador vigente, así la foto recién subida se ve sin cerrar la hoja.
- **El anunciador de rutas de Next.** Next deja un `role="alert"` vacío en `<body>`, así que las pruebas que comprueban «sin errores» miran solo dentro de `<main>`.

### Publicación y carta pública (fase 7)

- **Snapshot.** El servidor arma el snapshot del borrador con la forma de §E7 y con la clave de la imagen, no su URL. La plantilla y el estilo se resuelven en ese momento: por ahora ORIGINAL, con `source_style` o los valores por defecto.
  - «Cambios por publicar» compara JSON con las claves ordenadas, en cualquier nivel, sin que importe el orden de las claves.
  - El estado de publicación (cambios pendientes, fecha y slug) viaja en cada respuesta del borrador, así la barra se actualiza con cada edición.
- **Publicar.**
  - Pasa por el mismo bloqueo de §E7: no se publica mientras haya una digitalización activa.
  - Exige un producto disponible (400 `EMPTY_MENU`). Guarda el snapshot en un solo `UPDATE`.
  - Se confirma con el diálogo propio, en tono principal, porque no es destructivo.
  - Sin publicar y sin cambios la barra dice «Tu carta aún no está publicada.»: §E13 no prevé ese estado.
- **Caché de la carta pública (§E2).**
  - `unstable_cache` con la etiqueta `menu:{slug}`. Cache Components obligaría a envolver en `<Suspense>` cada página que lee cookies o cabeceras, es decir, todo el panel; la especificación admite cualquiera de los dos.
  - `/[slug]` declara `generateStaticParams` vacío: cada carta se genera en su primera visita y queda cacheada (ISR, ● en el build) hasta que se invalida.
  - `invalidatePublicMenu(slug)` llama a `revalidateTag(tag, { expire: 0 })`: la siguiente visita trae la carta nueva. Con el perfil `max` recomendado, la primera visita tras publicar habría visto la vieja.
  - También llama a `revalidatePath('/{slug}')`, que borra una 404 cacheada de ese slug.
  - Se invalida al publicar, al guardar el perfil y al registrar un restaurante (por si alguien visitó antes ese slug). La plantilla, la pausa y la eliminación se suman en sus fases.
  - Comprobado con `next start` sobre el build:
    - tras publicar, la primera visita es MISS y la segunda HIT;
    - un cambio del borrador sin publicar sigue siendo HIT, con el precio publicado;
    - republicar y guardar el perfil dan MISS con lo nuevo;
    - un slug inexistente da 404.
- **Slug inválido.** Un slug que no está normalizado (mayúsculas, puntos…) responde la 404 sin consultar la base ni crear una entrada de caché.
- **404 de la carta.** Un slug inexistente y un restaurante pausado se ven igual: «Esta carta no está disponible.», en el `not-found.tsx` del segmento.
  - Bajo `netlify dev`, el último reintento estático (`/{slug}/index.htm`) tiene dos segmentos y termina en la 404 global. La prueba lo comprueba directo contra Next.
- **Carta pública.**
  - Solo servidor: no añade JavaScript propio.
  - Cabecera con logo, nombre y dirección.
  - Barra fija de chips desplazable con las secciones que tienen productos disponibles, con `scroll-mt` para no tapar el título.
  - Lista o tarjetas: 1, 2 o 3 columnas.
  - «Opciones» y «Adicionales» con su precio.
  - Contacto: `tel:`, `wa.me/51…` y redes solo `https://`.
  - Pie «Carta digital creada con Sirio».
  - Metadatos «{nombre} · Carta digital», descripción, Open Graph `es_PE`, y `themeColor` con el fondo de la carta.
  - Las fotos de producto llevan `alt=""`, porque el nombre está al lado.
- **Fuentes.**
  - `--menu-font` lleva por ahora la familia del snapshot con `system-ui` de respaldo; la fase 8 carga las 12 familias.
  - La 404 global importaba las fuentes del panel, y como esa frontera está en el árbol de todas las páginas, la carta pública precargaba Fraunces e Inter. Ahora no usa `next/font`.
  - Los tokens `--font-display` y `--font-sans` llevan respaldo dentro de `var()`, para seguir siendo válidos donde `next/font` no definió la variable.

### Plantillas y fuentes (fase 8)

- **Tabla de §E7 en `src/shared/menu-style.ts`.** `resolveMenuStyle` devuelve el estilo fijo de TRADITIONAL, CASUAL o PREMIUM, o el detectado para ORIGINAL. Todas las plantillas fijas superan 11:1 de contraste.
- **Contraste mínimo de 4,5 para ORIGINAL.** `ensureReadableText` cambia un texto ilegible por negro o blanco, el que contraste más, con la razón WCAG. La fase 10 lo reutiliza para la respuesta de Gemini.
- **Las 12 fuentes con `next/font/google`** (`src/app/menu-fonts.ts`): una llamada literal por familia, `subsets: ['latin']` y `display: 'swap'`.
  - Lato y Poppins no tienen eje variable: piden 400/700 y 400/600/700. Las demás usan su eje variable.
  - `preload: false`: cada carta usa una sola familia, y precargar las 12 desperdiciaría ancho de banda. La familia en uso se descarga cuando su texto se pinta.
  - `--menu-font` toma `style.fontFamily` de la familia elegida, con la familia de respaldo que genera `next/font`.
- **Dónde se cargan.** Solo la carta pública y la vista previa de plantillas de `/panel/carta` importan ese módulo. Perfil, QR y Cuenta no tienen ninguna de esas familias en `document.fonts`, y una E2E lo vigila.
- **`PUT /api/carta/plantilla`.**
  - Pasa por el bloqueo de §E7.
  - La plantilla forma parte del snapshot: elegirla marca «Tienes cambios por publicar.» y no llega a la carta hasta publicar.
  - Invalida `menu:{slug}`, como pide §E2, aunque la carta solo cambie al publicar.
- **El borrador informa su apariencia** (plantilla y estilo detectado), para que la vista previa de ORIGINAL muestre los colores y la letra detectados.
- **Selector.**
  - Cuatro tarjetas-radio con la etiqueta, la descripción, la letra y una muestra: fondo, color de texto y el nombre del restaurante en la letra de la plantilla.
  - La elegida queda marcada con un anillo vino y la pastilla «Elegida».
  - La elección es optimista: se marca al instante y vuelve atrás si la API falla. Un radio controlado que esperaba al servidor parecía no responder al clic.
- **Pruebas que cuentan `h2`.** El selector añadió el `h2` «Plantilla», así que la prueba de reordenar secciones lo excluye.

### Digitalización I (fase 9)

- **`parseExtractedMenu`** (`src/shared/parse-extracted-menu.ts`) aplica todas las reglas de §E10. Sigue el criterio de la app principal: si una regla de estructura falla, la respuesta se rechaza entera (`INVALID_MODEL_RESPONSE`), y solo el estilo cae a valores seguros.
  - Excepción indulgente: una descripción vacía cuenta como `null`, como manda §E5.
  - Acepta precios como número o como texto numérico.
- **Extractor intercambiable** (`MenuExtractor`). En esta fase siempre es el simulado: espera 5 s y devuelve 2 secciones y 5 productos, uno con variantes, que pasan por `parseExtractedMenu`.
- **Flujo de §E10.**
  1. `POST /api/digitalizacion` crea el trabajo `UPLOADING`, con el mismo bloqueo de fila que las ediciones; 409 si hay otro.
  2. `PUT …/fotos/{n}` guarda cada foto en Blobs (`digitization/{jobId}/{n}`), con su tamaño en los metadatos para controlar los 12 MB del total, y añade la clave en SQL (`photo_keys || …`), sin perder claves con subidas simultáneas.
  3. El navegador invoca `/.netlify/functions/digitize-background`.
- **La función de fondo** (`config.background = true`):
  - Comprueba el Origin y la sesión del dueño.
  - Reclama el trabajo con el `UPDATE` atómico.
  - Reemplaza el borrador en una transacción (secciones LIST, productos disponibles sin imagen, `source_style`) y marca `SUCCEEDED` en la misma transacción.
  - Borra después las imágenes viejas, y en un `finally` las fotos.
  - Nunca lanza un error. Si algo falla, el trabajo queda `FAILED` con su código (`INTERNAL_ERROR` si no es del extractor).
- **Trabajos caducados.** El índice único deja un solo trabajo activo por restaurante, y un trabajo abandonado bloquearía la carta hasta el mantenimiento diario.
  - El candado y `/activa` solo cuentan trabajos frescos: `UPLOADING` de menos de 60 min y `PROCESSING` de menos de 20.
  - Los caducados se marcan `FAILED` al consultarlos y al crear otro: `MODEL_TIMEOUT` si se procesaban y `UPLOAD_ABANDONED` si se subían.
- **Seguimiento en el navegador.**
  - Consulta el estado cada 3 s.
  - La función responde 202 al instante, pero puede tardar en arrancar (en local, el empaquetado en frío): la E2E lo detectó al recargar, porque el trabajo seguía `UPLOADING` y la página lo tomaba por interrumpido.
  - Tras recargar, un trabajo `UPLOADING` tiene 20 s para empezar antes de mostrarse «La subida de las fotos anteriores no terminó.».
  - En el flujo normal, a los 30 s se reinvoca la función una vez (el reclamo atómico lo hace inofensivo), y a los 60 s se abandona con un mensaje.
- **Añadido: `DELETE /api/digitalizacion/{id}`.** Descarta una subida interrumpida («Descartar y volver a empezar»), así el dueño no espera una hora con la carta bloqueada. Solo vale para `UPLOADING`.
- **Interfaz.**
  - «Digitalizar desde fotos» está en la cabecera y en el estado vacío.
  - La hoja permite de 1 a 5 fotos, con miniaturas, tamaño, total y «Quitar». Las fotos se comprimen a 2000 px y ≤ 3 MB.
  - Si el borrador tiene productos, pide confirmar el reemplazo con el texto de §E10.
  - El estado muestra «Subiendo fotos… (1 de 2)» y «Leyendo tu carta con IA (puede tardar hasta 2 minutos)…».
  - Al terminar, «Carta digitalizada. Revísala y publícala cuando esté lista.»; si falla, el mensaje de su código y «Volver a intentar».
  - Mientras dura, el editor está deshabilitado.
- **Mantenimiento** (`maintenance.mts`, `15 9 * * *`): caduca trabajos por lotes de 50, con un corte a los 20 s. Probado contra la base local: un trabajo `UPLOADING` de hace 2 h pasó a `FAILED` (`UPLOAD_ABANDONED`).
- **Herramientas.**
  - `netlify dev` solo registra funciones si `netlify/functions` existía al arrancar: hubo que reiniciarlo.
  - ESLint ignora `.netlify/**`, donde `netlify dev` deja los paquetes de las funciones.
  - Las funciones exportan por defecto funciones con nombre (`import/no-anonymous-default-export`).

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

### Fase 3

- `pnpm lint`, `pnpm typecheck` y `pnpm build` en verde. El build también verifica los tipos de `tests/`.
- `pnpm test`: 77 pruebas. Cubren:
  - la validación de §E5: «Ñandú2024» válida; «clave» y «CLAVE2024» inválidas; «hola@turestaurante» inválido; «ana@mail.com» válido; conteo en caracteres;
  - los formularios;
  - el origen;
  - el token, el digest, la cookie y la renovación;
  - Argon2id (parámetros, sal, NFC, hash dañado);
  - `sendJson` y `redirectTarget` (solo rutas del sitio);
  - `homePathFor` y el tope del slug.
- `pnpm test:e2e`: 23 de 23. El `setup` crea al administrador desde `/registro`. La fase 3 cubre:
  - el registro del dueño;
  - la validación al enviar y su corrección;
  - el correo repetido (también en mayúsculas);
  - el error genérico;
  - la entrada del administrador;
  - los atributos de la cookie;
  - las redirecciones sin sesión, con sesión y por rol;
  - «Salir»;
  - el origen ajeno (403 directo a Next);
  - el cambio de contraseña (la anterior deja de servir y la otra sesión se cierra), y la contraseña actual equivocada;
  - el menú plegado a 390 px.

### Fase 4

- `pnpm lint`, `pnpm typecheck` y `pnpm build` en verde.
- `pnpm test`: 127 pruebas. Las nuevas cubren:
  - firmas de imagen: PNG, JPEG, WebP, texto renombrado a .png, un RIFF que no es WebP y firmas incompletas;
  - teléfono y WhatsApp;
  - redes por host (`http://instagram.com/x` y `https://evil.com/instagram.com` se rechazan);
  - el formulario de perfil y su normalización;
  - `PUBLIC_APP_URL`;
  - el patrón de claves de `/media`.
- `pnpm test:e2e`: 34 de 34. Los de la fase 4 cubren:
  - contacto y redes que siguen al recargar;
  - las redes inválidas;
  - el nombre que cambia sin tocar la dirección pública;
  - el logo: se sube, `/media` lo sirve con caché inmutable, se quita y su blob devuelve 404;
  - un PNG de 2400 px que llega como JPEG de 1600 px;
  - el texto renombrado a .png, rechazado en el navegador y en la API;
  - el QR: generado una vez y con las descargas `qr-{slug}.png` y `.svg`;
  - «Copiar enlace»;
  - el menú;
  - `/media` sin claves ajenas;
  - el perfil sin sesión.
- Capturas a 390 y 1280 px del perfil, el QR y el menú abierto, revisadas a mano.

### Fase 5

- `pnpm lint`, `pnpm typecheck` y `pnpm build` en verde.
- `pnpm test`: 153 pruebas. Las nuevas cubren:
  - precios: «18.5» → «18.50»; «abc», «-1» y «18,50» inválidos;
  - el formato «S/ 18.50»;
  - los nombres de sección y producto, y la descripción;
  - `moveItem`, con los extremos sin cambios y sin mutar la lista;
  - la renumeración;
  - `parseMenuDraft`.
- `pnpm test:e2e`: 43 de 43. Los de la fase 5 cubren:
  - el estado vacío;
  - crear dos secciones y tres productos, reordenarlos, y el orden que sigue tras recargar;
  - mover un producto a otra sección, editarlo y marcarlo «No disponible»;
  - el precio «abc» con su error, y «18.5» guardado como «S/ 18.50»;
  - eliminar una sección con su aviso de 2 productos y con «Cancelar»;
  - eliminar un producto;
  - «Subir» y «Bajar» con el teclado, conservando el foco;
  - Escape;
  - que otro dueño recibe 404 en cinco operaciones sobre la carta ajena.
- Capturas a 390 y 1280 px del editor, la hoja del producto y la confirmación, revisadas a mano.

### Fase 6

- `pnpm lint`, `pnpm typecheck` y `pnpm build` en verde.
- `pnpm test`: 158 pruebas. Las nuevas cubren:
  - 30 elementos aceptados y 31 rechazados, en las dos listas;
  - nombre vacío y precio inválido por fila;
  - la normalización;
  - `parseMenuDraft` con las listas.
- `pnpm test:e2e`: 52 de 52. Los de la fase 6 cubren:
  - un producto con 2 opciones y 1 adicional, igual tras recargar, con «2 opciones · 1 adicional» en la lista;
  - la validación y corrección por fila, con el foco en el error;
  - reordenar y quitar filas;
  - la API con 31 opciones;
  - la foto: subir, ver la miniatura, cambiarla (el blob anterior devuelve 404) y quitarla;
  - un texto disfrazado de PNG, rechazado en el navegador y en la API;
  - que borrar el producto o la sección borra la foto;
  - otro dueño, que recibe 404.
- Capturas de la hoja del producto (foto, opciones y adicionales) a 1280 y 390 px, revisadas a mano.

### Fase 7

- `pnpm lint`, `pnpm typecheck` y `pnpm build` en verde. `/[slug]` aparece como ● (SSG bajo demanda).
- `pnpm test`: 177 pruebas. Las nuevas cubren:
  - `canonicalJson` y la comparación con las claves en otro orden;
  - las listas cuyo orden sí cuenta;
  - los cambios por publicar, publicada y sin publicar;
  - la vista pública sin no disponibles ni secciones vacías;
  - `parseMenuSnapshot`;
  - WhatsApp: «987 654 321» → `wa.me/51987654321`, y 7 y 16 dígitos sin enlace;
  - `tel:` y solo `https://`;
  - el estilo ORIGINAL normalizado o por defecto.
- `pnpm test:e2e`: 60 de 60. Los de la fase 7 cubren:
  - «Próximamente» y el título;
  - `EMPTY_MENU`;
  - la carta publicada: índice solo con secciones disponibles, precios, opciones, adicionales, foto, sin productos ni secciones no disponibles, y el ancla del chip;
  - que el borrador no llega a la carta hasta republicar;
  - contacto, perfil, descripción y `og:locale`;
  - tarjetas en una columna a 390 px y en fila a 1280 px;
  - que no se precargan fuentes del panel;
  - la 404 de la carta.
- Comprobación manual de la caché con `next start` (arriba) y capturas a 390 y 1280 px de la carta y de la barra, revisadas a mano.

### Fase 8

- `pnpm lint`, `pnpm typecheck` y `pnpm build` en verde.
- `pnpm test`: 187 pruebas. Las nuevas cubren:
  - cada plantilla: ORIGINAL con el estilo detectado o por defecto, y las tres fijas ignorando lo detectado;
  - el contraste de todas;
  - la razón WCAG (21 y 4,48);
  - el texto ilegible que pasa a negro o a blanco;
  - el texto legible que no cambia.
- `pnpm test:e2e`: 65 de 65. Los de la fase 8 cubren:
  - Premium: cambios por publicar, la carta sin cambio antes de publicar, y oscura (#1d1815) con Playfair Display después;
  - Tradicional, Casual y vuelta a Original, con sus colores y letras;
  - que el panel no cambia de aspecto;
  - que las letras de las cartas solo están en la carta y en la vista previa;
  - una plantilla inválida, con 400.
- Capturas del selector y de una carta Premium a 390 y 1280 px, revisadas a mano.

### Fase 9

- `pnpm lint`, `pnpm typecheck` y `pnpm build` en verde.
- `pnpm test`: 205 pruebas. Las nuevas cubren:
  - `parseExtractedMenu`: válida; precio negativo; 51 secciones; más de 500 productos, más de 100 por sección y 31 variantes; secciones vacías; textos largos; descripción vacía; color inválido → por defecto; texto sin contraste → negro o blanco; fuente desconocida → Inter;
  - los mensajes de error;
  - el tamaño de archivo;
  - `parseDigitizationJob`;
  - la orquestación: sin reclamo no hace nada; con éxito borra las imágenes viejas y las fotos; con error marca el código y borra las fotos; nunca lanza.
- `pnpm test:e2e`: 71 de 71. Los de la fase 9 cubren:
  - el reemplazo tras confirmar, con la carta publicada intacta y cambios por publicar;
  - el bloqueo (409 `DIGITIZATION_IN_PROGRESS`) y el seguimiento tras recargar;
  - un archivo que no es imagen y una sexta foto;
  - la subida interrumpida y descartada;
  - la API: segundo trabajo 409, foto 6 y texto disfrazado 400, la función sin sesión no hace nada, y otro dueño recibe 404;
  - el estado vacío con «Digitalizar desde fotos».
- Comprobación manual del mantenimiento, y capturas de la hoja de fotos y del estado a 1280 y 390 px.

## Pendientes
- Fase 12: probar de punta a punta `must_change_password` con la contraseña temporal.
- Despliegue: al enlazar el sitio, configurar el directorio base `cartas-netlify` para que la CLI y el build usen esta carpeta.

## Cómo verificar

```powershell
cd cartas-netlify
pnpm install
pnpm lint; pnpm typecheck; pnpm test
pnpm dev:netlify     # http://localhost:8888 (en otra terminal; usa scripts/netlify-cli.ts)
pnpm db:local:apply  # aplica las migraciones a la base local
pnpm test:e2e        # reinicia la base local y corre Playwright
```
