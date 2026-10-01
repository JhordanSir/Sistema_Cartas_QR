# Sirio Cartas — versión Netlify

Cartas digitales para restaurantes. Un dueño se registra, arma su carta (a mano, o digitalizándola desde fotos con IA), la publica y la comparte con un código QR que nunca cambia. Los comensales la ven en `/{slug}`. Un backoffice mínimo permite al administrador pausar, eliminar o restablecer el acceso de cada restaurante. No incluye landing page.

Corre por completo en Netlify:

- Next.js (App Router) con el adaptador oficial.
- Netlify Database (Postgres) con Drizzle.
- Netlify Blobs para las imágenes.
- Netlify Functions para la digitalización (en segundo plano) y el mantenimiento diario (programada).

## Qué incluye

- **Cuentas**: registro, inicio y cierre de sesión, y cambio de contraseña. Las sesiones viven en la base de datos (cookie `HttpOnly`), y las contraseñas se guardan con Argon2id.
- **Perfil y QR**: nombre, logo, contacto y redes. El QR apunta a `PUBLIC_APP_URL/{slug}` y no cambia aunque cambie el nombre.
- **Editor de la carta**: secciones y productos, orden, disponibilidad, opciones, adicionales e imagen de cada producto. Se trabaja sobre un borrador; la carta pública solo cambia al publicar.
- **Plantillas**: Original (con los colores y la letra detectados en la carta), Tradicional, Casual y Premium.
- **Digitalización**: de 1 a 5 fotos de la carta se convierten, con Gemini, en un borrador nuevo para revisar y publicar.
- **Estadísticas**: visitas únicas por persona y día, por hora y por día de la semana, en hora de Lima.
- **Backoffice** (`/admin`): búsqueda, pausar y reactivar, eliminar y contraseña temporal.

## Requisitos

- Node.js 24 o superior y pnpm 11.
- Esta carpeta es un proyecto independiente, con su propio `pnpm-workspace.yaml` y su lockfile, aunque viva dentro del repositorio de Sirio.

## Variables de entorno

En local, copia `.env.example` a `.env`. En Netlify, configúralas en *Project configuration → Environment variables*.

| Variable | Para qué | ¿Obligatoria? |
|---|---|---|
| `PUBLIC_APP_URL` | El origen público, por ejemplo `https://sirio-cartas.netlify.app`. Los QR apuntan aquí, así que debe ser la dirección definitiva antes de que un dueño abra su QR por primera vez. | Sí |
| `SIRIO_GEMINI_API_KEY` | La clave de Google AI Studio para digitalizar. Sin ella, cada digitalización termina con «Gemini no está configurado correctamente…». | Para digitalizar |
| `GEMINI_MODEL` | El modelo de Gemini. Por defecto, `gemini-2.5-flash`. | No |
| `VIEW_HASH_SECRET` | 64 caracteres hexadecimales aleatorios (`openssl rand -hex 32`). Con ellos se calcula un hash de la IP de cada visitante; la IP nunca se guarda. Sin esta variable no se cuentan visitas. | Para las estadísticas |
| `DIGITIZATION_FAKE` | Solo en local: con `1`, un extractor simulado reemplaza a Gemini. Lo usa Playwright; en Netlify no tiene efecto. | No |

La base de datos no necesita variables: Netlify Database las inyecta, y `netlify dev` levanta una base local.

## Cómo funciona el registro

- La **primera** cuenta que se crea en `/registro` es la del **administrador**: no tiene restaurante y entra al backoffice. Créala tú apenas despliegues, antes de compartir la dirección.
- Todas las siguientes son de **dueños**, y cada una crea su restaurante. El slug sale del nombre (`Cevichería Luna` → `cevicheria-luna`, y si ya existe, `-2`, `-3`…). El slug y el QR no cambian nunca.
- El registro es libre: cualquiera que tenga la dirección puede crear un restaurante.

## Contraseñas olvidadas

No se envían correos. «¿Olvidaste tu contraseña?» solo indica que hay que contactar al administrador. Para restablecer la contraseña de un dueño:

1. En `/admin`, busca el restaurante por nombre, slug o correo.
2. Pulsa **Contraseña temporal** y confirma. La app muestra **una sola vez** una contraseña de 12 caracteres, con un botón **Copiar**.
3. Compártela con el dueño por un canal de confianza.
4. Al entrar con ella, el dueño tiene que elegir una nueva antes de seguir. Sus sesiones abiertas se cierran y su contraseña anterior deja de servir.

El administrador cambia la suya en `/admin/cuenta`. Si la olvida, no hay forma de recuperarla desde la app.

## Límites conocidos

- **Sin correos**: no hay verificación de cuentas ni recuperación automática de contraseñas.
- **Sin antiabuso**: el registro y el inicio de sesión no limitan los intentos ni piden captcha. Si hiciera falta, se pueden activar las reglas de límite de peticiones de Netlify.
- **Gemini con clave propia**: la digitalización usa tu cuenta de Google AI Studio, y su facturación, no el AI Gateway de Netlify.
  - Google solo sirve `gemini-2.5-flash` a las cuentas que ya lo usaban.
  - Si la clave es de un proyecto nuevo y la digitalización falla por configuración, pon en `GEMINI_MODEL` el modelo Flash vigente, por ejemplo `gemini-3.8-flash`.
- **Tamaños**: Netlify acepta unos 6 MB por petición. Por eso los logos y las fotos de producto se comprimen en el navegador, y las fotos para digitalizar van de 1 a 5, con hasta 3 MB cada una y 12 MB en total.
- **Estadísticas aproximadas**: una visita única es una IP por día, así que varias personas en la misma red cuentan como una. Las visitas de hace más de 30 días se guardan resumidas por hora.
- **Un restaurante por cuenta.**
- **Blobs compartidos**: el almacén `uploads` es el mismo para producción y para los Deploy Previews.

## Desarrollo local

```powershell
cd cartas-netlify
pnpm install
copy .env.example .env
pnpm dev:netlify     # http://localhost:8888, con base de datos, Blobs y funciones locales
pnpm db:local:apply  # en otra terminal: aplica las migraciones a la base local
```

Usa siempre `pnpm dev:netlify` y `pnpm cli:netlify <argumentos>`, nunca `netlify` a secas. El envoltorio `scripts/netlify-cli.ts` hace que la CLI tome esta carpeta como raíz; por su cuenta, tomaría la del repositorio y su `.env`.

### Base de datos

El esquema vive en `db/schema.ts` (Drizzle), y las migraciones SQL, en `netlify/database/migrations/`. Netlify las aplica al desplegar.

```powershell
pnpm db:generate --name <cambio>   # nueva migración a partir de db/schema.ts
pnpm db:local:apply                # aplica las pendientes a la base local (con netlify dev en marcha)
pnpm db:local:reset                # vacía la base local y aplica todas las migraciones
```

Los dos últimos solo actúan sobre la base local de `netlify dev`, y se niegan a correr si la conexión no es a `localhost`. Nunca uses `drizzle-kit push` ni `migrate`.

### Pruebas

```powershell
pnpm lint
pnpm typecheck
pnpm test        # Vitest
pnpm test:e2e    # Playwright (Chromium de escritorio) contra netlify dev
```

- La primera vez, Playwright necesita su navegador: `pnpm exec playwright install chromium`.
- Cada corrida de `pnpm test:e2e` reinicia la base local, así que borra lo que hayas creado a mano, y crea un administrador de prueba.
- Playwright arranca `netlify dev` con el extractor simulado (`DIGITIZATION_FAKE=1`) y un `VIEW_HASH_SECRET` de prueba. Si ya hay un `netlify dev` en marcha, lo reutiliza: detenlo antes, o arráncalo con esas dos variables.

## Despliegue

1. Enlaza esta carpeta con el proyecto de Netlify (`pnpm cli:netlify link`), con `cartas-netlify` como directorio base.
2. Configura las variables de entorno.
3. Despliega con `pnpm cli:netlify deploy --prod`. Netlify construye Next.js con su adaptador, aplica las migraciones de la base de datos y publica las funciones.
4. Entra a `/registro` y crea la cuenta de administrador.

## Documentación

- [docs/ESPECIFICACION.md](docs/ESPECIFICACION.md): la especificación funcional (E1–E13).
- [docs/plan.md](docs/plan.md): el plan por fases.
- [PROGRESS.md](PROGRESS.md): lo hecho en cada fase, las decisiones y cómo se verificó.
- [CLAUDE.md](CLAUDE.md): las reglas para trabajar en el código.
