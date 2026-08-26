# Despliegue en Dokploy

Este proyecto se despliega como una aplicación **Docker Compose** de Dokploy. El archivo de despliegue es `./compose.yml` y construye tres servicios: `postgres`, `api` y `web`.

## Antes de desplegar

1. Apunta los registros DNS `A` y, si corresponde, `AAAA` del dominio a la IP pública del VPS.
2. Confirma que el repositorio contiene `pnpm-lock.yaml` y que las imágenes se construyen localmente con `docker compose build`.
3. Conserva el archivo `.env` en la raíz únicamente para desarrollo local. Está ignorado por Git y también por el contexto de construcción de Docker.
4. Carga en la pestaña **Environment** de Dokploy las mismas variables de producción. Dokploy materializa esas variables en un `.env` junto a `compose.yml` durante el despliegue.

El Compose no usa `env_file`: cada servicio recibe solo las variables que necesita. De este modo, las credenciales de PostgreSQL, JWT, Gemini y del administrador inicial no llegan al contenedor web.

## Variables de producción

Configura, como mínimo, estos valores en Dokploy:

```dotenv
POSTGRES_DB=cartas_qr
POSTGRES_USER=cartas_qr
POSTGRES_PASSWORD=<secreto-largo-y-unico>
DATABASE_URL_DOCKER=postgresql://cartas_qr:<password-url-encoded>@postgres:5432/cartas_qr?schema=public
JWT_ACCESS_SECRET=<secreto-aleatorio>
JWT_REFRESH_SECRET=<otro-secreto-aleatorio>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
CORS_ORIGINS=https://cartas.example.com
GEMINI_API_KEY=<api-key>
GEMINI_MODEL=<modelo-configurado>
GEMINI_TIMEOUT_MS=60000
GEMINI_MAX_RETRIES=2
INITIAL_ADMIN_EMAIL=admin@example.com
INITIAL_ADMIN_PASSWORD=<password-inicial>
VIEW_IP_HASH_SECRET=<secreto-aleatorio>
PUBLIC_APP_URL=https://cartas.example.com
API_INTERNAL_URL=http://api:3001
APP_TIMEZONE=America/Lima
LOG_LEVEL=info
TZ=UTC
WEB_PORT=3000
API_PORT=3001
```

`DATABASE_URL_DOCKER` usa `postgres` como hostname porque ese es el nombre DNS del servicio dentro de Compose. La variable local `DATABASE_URL` no se pasa al contenedor y puede seguir apuntando a `localhost`. Si la contraseña contiene caracteres reservados de una URL, codifícalos al construir `DATABASE_URL_DOCKER`.

Genera secretos JWT independientes y suficientemente largos. Cambia `INITIAL_ADMIN_PASSWORD` después del primer acceso y no guardes valores reales en `.env.example` ni en Git.

## Crear la aplicación Compose

1. Crea un proyecto y un entorno de producción en Dokploy.
2. Añade un servicio de tipo **Docker Compose**, no **Stack**. El modo Stack no admite la directiva `build` utilizada por este repositorio.
3. Selecciona el proveedor Git, repositorio y rama de producción.
4. Establece **Compose Path** en `./compose.yml`.
5. Activa **Isolated Deployments** si está disponible.
6. Pega las variables anteriores en **Environment** y revisa **Preview Compose**. No debe aparecer ningún secreto en el servicio `web`.
7. Ejecuta el primer despliegue.

El contenedor `api` espera a que PostgreSQL esté saludable, ejecuta `pnpm db:deploy` y después inicia `apps/api/dist/main.js`. Si una migración falla, la API no arranca y el despliegue debe investigarse antes de reintentarlo.

## Dominio y HTTPS

Usa la pestaña **Domains** de la aplicación Compose:

1. Añade el dominio público.
2. Selecciona el servicio `web`.
3. Configura el puerto interno `3000`.
4. Activa HTTPS y el emisor de certificados configurado en Dokploy.
5. Redeploya la aplicación para que Dokploy aplique las etiquetas de Traefik.

No añadas etiquetas de Traefik ni la red `dokploy-network` manualmente al archivo. Dokploy Native Domains incorpora el routing durante el despliegue. Tampoco publiques `api` ni `postgres`: el navegador entra por `web`, y Next.js se comunica con la API mediante `http://api:3001` dentro de `app_network`.

`WEB_PORT` publica el frontend en el host para pruebas locales. En el VPS elige un puerto libre si `3000` ya está ocupado; Native Domains dirige tráfico al puerto interno `3000` y no depende de ese puerto del host.

## Persistencia y copias de seguridad

Compose crea dos volúmenes Docker nombrados:

- `postgres_data`, montado en `/var/lib/postgresql/data`.
- `uploads_data`, montado en `/app/storage`.

Los volúmenes sobreviven a recreaciones y actualizaciones de los contenedores. No elimines la aplicación Compose con sus volúmenes ni ejecutes `docker compose down --volumes`. En Dokploy, el nombre físico suele llevar el prefijo de la aplicación.

Configura copias programadas hacia un destino S3 desde **Volume Backups** para ambos volúmenes. Para PostgreSQL, prefiere además una copia lógica consistente; copiar un volumen mientras la base escribe puede producir un respaldo inconsistente.

## Verificación posterior

Después de cada despliegue comprueba:

1. `postgres` figura saludable por `pg_isready`.
2. `api` figura saludable mediante `GET /health/ready`.
3. `web` figura saludable mediante `GET /health`.
4. `https://<dominio>/health` responde correctamente.
5. El menú público y las rutas `/admin` y `/backoffice` cargan por HTTPS.
6. La API accede a PostgreSQL y los archivos subidos aparecen bajo el volumen `uploads_data`.
7. Tras recrear `api` y `postgres`, tanto los registros como un archivo de prueba siguen disponibles.

Antes de subir cambios al VPS valida la interpolación sin mostrarla en logs públicos:

```bash
docker compose config --quiet
docker compose build
docker compose up -d --wait
docker compose ps
```

Docker Compose puede introducir una interrupción breve al recrear `api` o `web`; los healthchecks evitan arrancar dependencias antes de tiempo, pero por sí solos no proporcionan un despliegue blue-green o canary.
