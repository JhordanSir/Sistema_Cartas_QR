# Progreso — Sirio Cartas (versión Netlify)

## Fase actual

Fase 5 de 13 — Editor: secciones y productos.

## Fases completadas

1. Esqueleto, reglas y diseño base.
2. Base de datos: esquema Drizzle, migración inicial y `GET /api/salud`.
3. Cuentas: registro, inicio y cierre de sesión, cambio de contraseña, y la barra superior del panel y del backoffice.
4. Perfil del restaurante (logo en Netlify Blobs y `/media`) y código QR.

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

## Pendientes
- Fase 9: confirmar que `netlify dev` (ya con el envoltorio) sirve `netlify/functions` de esta carpeta.
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
