# Despliegue en Dokploy

Este proyecto se despliega como una aplicación **Docker Compose** de Dokploy. El archivo de despliegue es `./compose.yml` y construye cuatro servicios: `postgres`, `api`, `web` y `nginx`.

## Antes de desplegar

1. Apunta los registros DNS `A` y, si corresponde, `AAAA` del dominio a la IP pública del VPS.
2. Confirma que el repositorio contiene `pnpm-lock.yaml` y que las imágenes se construyen localmente con `docker compose build`.
3. Conserva el archivo `.env` en la raíz únicamente para desarrollo local. Está ignorado por Git y también por el contexto de construcción de Docker.
4. Carga en la pestaña **Environment** de Dokploy las mismas variables de producción. Dokploy materializa esas variables en un `.env` junto a `compose.yml` durante el despliegue.
5. Decide y verifica el dominio HTTPS canónico antes de dar de alta restaurantes. Ese origen será parte permanente de cada QR impreso.

El Compose no usa `env_file`: cada servicio recibe solo las variables que necesita. De este modo, las credenciales de PostgreSQL, JWT, Gemini y del administrador inicial no llegan al contenedor web.

## Variables de producción

Configura, como mínimo, estos valores en Dokploy:

```dotenv
POSTGRES_DB=cartas_qr
POSTGRES_USER=cartas_qr
POSTGRES_PASSWORD=<secreto-largo-y-unico>
DATABASE_URL_DOCKER=postgresql://cartas_qr:<password-url-encoded>@postgres:5432/cartas_qr?schema=public
API_INTERNAL_URL_DOCKER=http://api:3001
JWT_ACCESS_SECRET=<secreto-aleatorio>
JWT_REFRESH_SECRET=<otro-secreto-aleatorio>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
JWT_ISSUER=sirio-cartas-qr
JWT_AUDIENCE=sirio-cartas-qr-api
CORS_ORIGINS=https://cartas.example.com
GEMINI_API_KEY=<api-key>
GEMINI_MODEL=gemini-2.5-flash
GEMINI_TIMEOUT_MS=60000
GEMINI_MAX_RETRIES=2
INITIAL_ADMIN_EMAIL=admin@example.com
INITIAL_ADMIN_PASSWORD=<password-inicial>
VIEW_IP_HASH_SECRET=<secreto-aleatorio>
PUBLIC_APP_URL=https://cartas.example.com
APP_TIMEZONE=America/Lima
LOG_LEVEL=info
TZ=UTC
API_PORT=3001
```

`DATABASE_URL_DOCKER` usa `postgres` como hostname porque ese es el nombre DNS del servicio dentro de Compose. La variable local `DATABASE_URL` no se pasa al contenedor y puede seguir apuntando a `localhost`. Si la contraseña contiene caracteres reservados de una URL, codifícalos al construir `DATABASE_URL_DOCKER`.

Genera secretos JWT independientes y suficientemente largos. Tras el primer acceso cambia la contraseña del administrador mediante `POST /api/auth/admin/password`; el seed es idempotente y no reemplaza una cuenta existente. Sustituye luego `INITIAL_ADMIN_PASSWORD` en Dokploy por otro valor aleatorio que no reutilices. No guardes valores reales en `.env.example` ni en Git.

### URL permanente de los QR

`PUBLIC_APP_URL` debe ser exclusivamente el origen HTTPS público y canónico, por ejemplo `https://cartas.example.com`: sin ruta, query, fragmento ni un dominio temporal de Dokploy. Debe coincidir con el dominio que se asignará al servicio `web` y con `CORS_ORIGINS`.

Al crear un restaurante, la API guarda en la misma transacción `PUBLIC_APP_URL/{slug}` y sus documentos QR en PNG y SVG. El slug, payload y archivos resultantes son inmutables; cambiar `PUBLIC_APP_URL` en una actualización posterior no modifica los QR que ya existen. Configura el valor definitivo antes de crear restaurantes o imprimir material. Si se migra de dominio, conserva el dominio anterior con una redirección hacia el nuevo sitio para no romper los códigos ya distribuidos.

Se considera legado cualquier restaurante que todavía tenga los tres campos `qrPayload`, `qrPng` y `qrSvg` sin materializar. Estas filas se completan exactamente una vez cuando su dueño abre la gestión de QR. La materialización heredada usa el `PUBLIC_APP_URL` configurado en ese primer acceso, por lo que conviene realizarla únicamente después de configurar el dominio final y, si se requiere materializar todos los legados, abrir `/admin/qr` para cada restaurante con su dueño autorizado.

## Crear la aplicación Compose

1. Crea un proyecto y un entorno de producción en Dokploy.
2. Añade un servicio de tipo **Docker Compose**, no **Stack**. El modo Stack no admite la directiva `build` utilizada por este repositorio.
3. Selecciona el proveedor Git, repositorio y rama de producción.
4. Establece **Compose Path** en `./compose.yml`.
5. Activa **Isolated Deployments** si está disponible.
6. Pega las variables anteriores en **Environment** y revisa **Preview Compose**. No debe aparecer ningún secreto en el servicio `web`.
7. Ejecuta el primer despliegue.

El contenedor `api` espera a que PostgreSQL esté saludable, ejecuta `prisma migrate deploy`, crea de forma idempotente el administrador inicial y después inicia `apps/api/dist/main.js`. Si una migración o el seed falla, la API no arranca y el despliegue debe investigarse antes de reintentarlo.

## Dominio y HTTPS

Usa la pestaña **Domains** de la aplicación Compose:

1. Añade el dominio público.
2. Selecciona el servicio `web`.
3. Configura el puerto interno `80` del servicio `nginx`.
4. Activa HTTPS y el emisor de certificados configurado en Dokploy.
5. Redeploya la aplicación para que Dokploy aplique las etiquetas de Traefik.

No añadas etiquetas de Traefik ni la red `dokploy-network` manualmente al archivo. Dokploy Native Domains incorpora el routing durante el despliegue. El navegador entra por `nginx:80`; Nginx reenvía la aplicación a `web:3000` y Next.js se comunica con la API mediante `http://api:3001` dentro de `app_network`. Tampoco publiques `api` ni `postgres`.

El Compose de producción no publica ningún puerto del host. `nginx` expone internamente el puerto `80`, `web` expone `3000` y `api` expone `3001` solo en sus redes de contenedores; Native Domains dirige el tráfico al puerto interno `80` de `nginx`. El gateway conserva los encabezados de proxy y admite cargas de hasta 16 MB, con un timeout de lectura de 240 segundos para la digitalización de cartas.

Durante despliegues aislados, Dokploy puede recrear `web` con una IP nueva. Nginx usa el DNS interno de Docker en cada petición, por lo que vuelve a resolver `web:3000` y no retiene la IP del contenedor anterior.

Si administras un Nginx externo en vez de los dominios nativos de Dokploy, añade `./compose.nginx-host.yml` al despliegue y configura su upstream como `http://127.0.0.1:8080`. Ese override publica el mismo gateway interno (puerto 80 del contenedor) únicamente en loopback. No asignes `NGINX_PORT=80` mientras Dokploy, Nginx Proxy Manager u otro proxy del host ya controle los puertos 80/443.

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
8. El login del administrador funciona y un refresh token rotado no puede reutilizarse.
9. `/backoffice` permite crear un restaurante, deshabilitarlo y reactivarlo; `/{slug}` responde 404 mientras está deshabilitado.
10. Una eliminación definitiva quita el restaurante y deja en cero las tareas pendientes de `AssetDeletionJob` cuando el volumen está disponible.
11. El dueño inicia sesión en `/admin/login`, completa el perfil, sube un logo válido y conserva ambos después de recargar y recrear el contenedor `api`.
12. El dueño abre `/admin/menu`, sube de 1 a 5 fotos válidas, espera la publicación síncrona y verifica que una corrección posterior aparece en `/{slug}`.
13. El dueño abre `/admin/qr`, confirma que el enlace es `https://<dominio>/<slug>`, previsualiza el QR y descarga PNG y SVG. Tras editar la carta o el nombre visible, vuelve a comprobar que los archivos y el enlace no cambiaron.
14. Sin iniciar sesión, abre `https://<dominio>/<slug>` desde un móvil: la carta muestra solo productos disponibles y el índice horizontal de categorías permite saltar entre secciones. Deshabilita el restaurante en el backoffice y confirma que la misma URL devuelve 404 hasta reactivarlo.

La sesión del backoffice se almacena en cookies HTTP-only. `PUBLIC_APP_URL` debe coincidir exactamente con el origen HTTPS que usará el operador, ya que también participa en la validación CSRF y en el atributo `Secure` de las cookies; por la inmutabilidad de los QR, no debe sustituirse por un dominio distinto después de crear restaurantes.

Los archivos de cada restaurante deben guardarse bajo `/app/storage/restaurants/<uuid>`. El logo del perfil ocupa `profile/logo` dentro de ese directorio y admite PNG, JPG o WebP de hasta 2 MB. La baja definitiva elimina el directorio completo; si la operación del volumen falla, queda una tarea durable en PostgreSQL y el contenedor `api` reintenta la limpieza en el siguiente arranque.

Las fotos fuente de digitalización no se escriben en el volumen: se validan, se envían inline a Gemini y se descartan al completar la solicitud. El límite de producto es 5 fotos, 3 MB por archivo y 12 MB totales. Gemini usa timeout y reintentos acotados configurables; un 429 o un fallo 5xx puede reintentarse, mientras que credenciales o solicitudes inválidas fallan inmediatamente.

Antes de subir cambios al VPS valida la interpolación sin mostrarla en logs públicos:

```bash
docker compose config --quiet
docker compose build
docker compose up -d --wait
docker compose ps
```

Docker Compose puede introducir una interrupción breve al recrear `api` o `web`; los healthchecks evitan arrancar dependencias antes de tiempo, pero por sí solos no proporcionan un despliegue blue-green o canary.
