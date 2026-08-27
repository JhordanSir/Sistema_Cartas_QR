# Plan de Implementación — Sistema de Cartas QR (Sirio Automatiza)

## Contexto

El documento [`Requerimientos_Sistema_Cartas_QR.md`](e:\Sistema_Cartas_QR\Requerimientos_Sistema_Cartas_QR.md) (v1.2, agosto 2026) define un sistema de digitalización de cartas de restaurantes vía QR fijo + IA (Gemini), con tres frentes: panel del dueño, vista pública del menú y backoffice del administrador de plataforma. El repositorio está vacío (solo `compose.yml`, `.env.example` y `.gitignore` sin contenido): este es un proyecto desde cero.

Antes de planificar se resolvieron por conversación todas las decisiones de arquitectura y los vacíos de interpretación que el documento no cubre, para que ninguna fase avance sobre supuestos. Este plan divide el trabajo en 9 fases (0 a 8); **al final de cada fase me detengo y espero tu confirmación explícita antes de continuar con la siguiente**.

## Estado de ejecución

- **Fase 0 — completada el 26 de agosto de 2026**: monorepo, schema y migración Prisma, slugs reservados, Jest, Playwright, Dockerfiles, healthchecks y Compose para Dokploy verificados localmente.
- **Fase 1 — completada el 26 de agosto de 2026**: JWT access/refresh con rotación y revocación de sesiones, Argon2id, roles, pertenencia, cambio/reset de contraseña y bootstrap idempotente del administrador verificados localmente.
- **Fase 2 — completada el 26 de agosto de 2026**: alta transaccional, slugs únicos e inmutables, deshabilitación/reactivación, eliminación durable de datos/archivos y backoffice responsivo verificados localmente.
- **Fase 3 — completada el 26 de agosto de 2026**: login y panel responsivo del dueño, perfil de contacto/redes, logo persistente con validación binaria y aislamiento por pertenencia verificados localmente.
- **Fase 4 — pendiente de confirmación**: no se ha iniciado la digitalización de cartas mediante Gemini.

## Decisiones de arquitectura confirmadas

| Decisión | Elección |
|---|---|
| Backend | Node.js + NestJS + TypeScript |
| Base de datos / ORM | PostgreSQL + Prisma |
| Frontend | Next.js (React), **una sola app** con rutas por rol (`/admin` dueño, `/backoffice` admin, `/{slug}` vista pública) |
| Estructura de repo | Monorepo (pnpm workspaces): `apps/api`, `apps/web`, `packages/shared` |
| Almacenamiento de imágenes | Volumen local de Docker en el VPS |
| Multi-tenancy | Esquema compartido en PostgreSQL, filtrado por `restaurantId` |
| Autenticación | JWT (access + refresh token) |
| Testing unitario | Jest (backend y frontend) |
| Testing e2e | Playwright (API y navegador) |
| CI/CD | Ninguno en el MVP; tests locales antes de cada pausa de fase, deploy manual vía Dokploy |
| Backups/DR | Fuera de alcance de este plan |
| Política de contraseñas | Mínimo 8 caracteres, hash con bcrypt/argon2 |
| Moneda | Soles (PEN), formato `S/ 12.50`, `decimal(10,2)` |
| Recursos ya disponibles | API key de Gemini, dominio registrado, VPS con Dokploy configurado |

## Desviaciones explícitas respecto al documento v1.2

Estas decisiones **cambian o completan** el texto literal del documento; quedan documentadas aquí para que no se pierdan de vista:

1. **RF-05 (recuperación de contraseña por correo) se reemplaza**: no se implementa envío de email. El dueño que pierde el acceso contacta por WhatsApp (+51 973 502 261) al administrador, quien resetea la contraseña desde el backoffice. RF-04 (cambio de contraseña propio) se mantiene tal cual.
2. **Alta de restaurante dividida en dos pasos**: el admin crea la cuenta solo con nombre + correo + contraseña inicial (RF-02); el dueño completa logo y datos de contacto desde su propio panel tras su primer login (ampliación de RF-09, que no especificaba quién carga esos datos).
3. **Foto opcional por producto**: se agrega un campo de imagen opcional a `Product`, fuera del alcance original del "Enfoque B" (plantilla clonada solo con texto). Pedido explícito, se documenta como ampliación de RF-19/RF-20.
4. **Slugs reservados**: como el panel del dueño y el backoffice viven bajo la misma app en rutas fijas (`/admin`, `/backoffice`, `/api`, `/login`, etc.), la generación de slugs (RF-07/RF-08) debe excluir esa lista reservada para que ningún restaurante pueda colisionar con esas rutas.
5. **Límites de subida de fotos de carta (RF-14)**: no se fijan ahora; se definen como parte del diseño técnico de la Fase 4, considerando los límites reales de la API de Gemini.

## Estructura del proyecto (a crear en Fase 0)

```
apps/
  api/        # NestJS: auth, restaurantes, productos, digitalización IA, estadísticas
  web/        # Next.js: /admin (dueño), /backoffice (admin), /{slug} (vista pública)
packages/
  shared/     # Tipos/DTOs compartidos entre api y web
prisma/
  schema.prisma
docker/
compose.yml   # postgres + api + web, volumen de imágenes persistente
```

## Convenciones por fase

- Cada fase implementa su alcance, corre sus pruebas unitarias (Jest) y e2e (Playwright) localmente, y muestra el resultado.
- Al cierre de cada fase se propone un commit (sin push ni merge sin pedirlo explícitamente).
- **Me detengo al final de cada fase y espero que digas que continúe** antes de empezar la siguiente.

---

## Fase 0 — Fundamentos y scaffolding del monorepo

**Objetivo**: dejar el esqueleto del sistema corriendo localmente con Docker Compose, antes de construir features.

**Tareas clave**:
- Monorepo pnpm (`apps/api` NestJS, `apps/web` Next.js App Router, `packages/shared`).
- `compose.yml`: servicios `postgres`, `api`, `web`, volumen para imágenes.
- `prisma/schema.prisma` con las entidades base del modelo de datos (§6 del documento): `Restaurant`, `Category`, `Product`, `ProductVariant`, `ProductExtra`, `Owner` (dueño), `Admin`, `ViewEvent`, `ViewSummary`.
- Utilidad de generación/normalización de slugs + lista de slugs reservados (ver desviación #4).
- Configuración base de Jest (api y web) y Playwright (e2e), con un primer test de humo.
- `.env.example` real con todas las variables necesarias (DB, JWT secrets, Gemini API key, dominio).

**Skills**: `database-schema-designer`, `postgres-pro`, `nestjs-expert`, `nextjs-developer`, `docker-testing`, `docker-testcontainers`, `jest-unit`.

**Pruebas unitarias**: validación del schema Prisma (migración aplica sin error), utilidad de normalización de slugs (casos con tildes, espacios, mayúsculas, colisión con reservados).

**Pruebas e2e**: `docker compose up` levanta los 3 servicios; endpoint de health check de `api` responde 200; `web` sirve la página raíz.

**Pausa**: reviso contigo que el entorno local corre correctamente antes de seguir.

---

## Fase 1 — Autenticación, roles y bootstrap de administrador

**Objetivo**: implementar RF-02 a RF-05 (con la desviación #1) y RNF-05.

**Tareas clave**:
- Login JWT (access + refresh) para `Owner` y `Admin`.
- Guards de rol (`OWNER` / `ADMIN`) y de pertenencia (un dueño solo accede a sus propios restaurantes).
- Script de seed que crea el admin inicial desde variables de entorno (sin ruta pública de registro).
- Endpoint de cambio de contraseña propio (RF-04, min. 8 caracteres).
- Endpoint de reseteo de contraseña de un dueño, exclusivo para `Admin` (reemplazo de RF-05).
- Hash de contraseñas con bcrypt/argon2 (RNF-05).

**Skills**: `nestjs-expert`, `jwt-security-testing`, `authentication-testing`, `authorization-testing`, `secure-code-guardian`, `owasp-security`, `jest-unit`, `playwright-api`.

**Pruebas unitarias**: emisión/validación de tokens, hash y verificación de contraseña, guards de rol y de pertenencia, validación de longitud mínima.

**Pruebas e2e**: login exitoso dueño y admin, login con credenciales inválidas, cambio de contraseña propio, reseteo de contraseña por admin, acceso denegado a rutas del rol equivocado.

**Pausa**: reviso contigo los flujos de autenticación antes de seguir.

---

## Fase 2 — Backoffice: ciclo de vida de restaurantes

**Objetivo**: RF-02, RF-06 a RF-13.

**Tareas clave**:
- Alta de restaurante desde backoffice (nombre + correo + contraseña inicial) → genera id único (UUID), slug único (con sufijo incremental y exclusión de reservados), registro base.
- Deshabilitar / reactivar restaurante (RF-10, RF-11): la vista pública deja de responder, el panel del dueño sigue accesible.
- Eliminación definitiva (RF-12, RF-13): doble confirmación explícita, borrado en cascada de registros, estadísticas y archivos/imágenes asociados en el volumen.
- UI de backoffice: listado, alta, deshabilitar/reactivar, eliminar con confirmación.

**Skills**: `nestjs-expert`, `database-schema-designer`, `multi-tenant-testing`, `file-upload-testing`, `secure-code-guardian`, `nextjs-developer`, `react-testing-library`, `playwright-e2e`.

**Pruebas unitarias**: generación de slug con colisiones y reservados, servicio de eliminación (verifica que no quedan registros/archivos huérfanos — RNF-09).

**Pruebas e2e**: flujo completo crear → deshabilitar (verificar que `/{slug}` deja de mostrar el menú) → reactivar → eliminar definitivo (con confirmación) desde la UI del backoffice.

**Pausa**: reviso contigo el ciclo de vida completo antes de seguir.

---

## Fase 3 — Panel del dueño: perfil del restaurante

**Objetivo**: RF-09 (logo y datos de contacto, a cargo del dueño tras su primer login — desviación #2).

**Tareas clave**:
- Formulario de perfil: logo (upload), teléfono/WhatsApp del restaurante, dirección, redes sociales (campos opcionales).
- Persistencia de logo en el volumen de imágenes.

**Skills**: `nextjs-developer`, `file-upload-testing`, `image-processing-testing`, `react-testing-library`, `responsive-testing-automation`.

**Pruebas unitarias**: validación de DTO de perfil, validación de tipo/tamaño de imagen del logo.

**Pruebas e2e**: dueño sube logo y completa datos de contacto, cambios visibles al recargar el panel.

**Pausa**: reviso contigo el perfil del dueño antes de seguir.

---

## Fase 4 — Digitalización de la carta con IA (Gemini)

**Objetivo**: RF-14 a RF-18.

**Tareas clave**:
- Endpoint de subida de una o varias fotos de carta; definir aquí (diseño técnico) los límites de tamaño/cantidad/formato considerando los límites reales de la API de Gemini (desviación #5).
- Servicio de integración con Gemini API: prompt de extracción estructurada (categorías, productos, descripciones, precios, variantes/adicionales) + estimación de estilo visual (colores, tipografía aproximada vía Google Fonts).
- Procesamiento **síncrono**: el dueño ve una pantalla de carga hasta que el sistema publica el menú automáticamente (sin paso de revisión, RF-17).
- Edición manual posterior de cualquier dato mal interpretado (RF-18) — UI reutiliza la gestión de productos de la Fase 5.
- Manejo de errores/timeouts de Gemini (reintento o mensaje claro al dueño).

**Skills**: `nestjs-expert`, `file-upload-testing`, `image-processing-testing`, `prompt-engineer`, `llm-output-testing`, `secure-code-guardian`.

**Pruebas unitarias**: parsing/validación del JSON estructurado devuelto por Gemini (mockeado), manejo de respuestas parciales o inválidas, aplicación de estilo visual estimado.

**Pruebas e2e**: subir fotos de prueba reales → verificar menú publicado automáticamente con datos extraídos → corregir manualmente un dato mal interpretado.

**Pausa**: reviso contigo el resultado de digitalizar una carta real antes de seguir.

---

## Fase 5 — Gestión de productos

**Objetivo**: RF-19 a RF-26, más foto opcional por producto (desviación #3).

**Tareas clave**:
- CRUD de categorías y productos (alta, edición, eliminación).
- Variantes (RF-21) y adicionales/extras (RF-22), cada uno con su propio precio.
- Marcar producto como no disponible (oculta de vista pública sin eliminar) y eliminación definitiva.
- Reordenar categorías y productos.
- Upload de foto opcional por producto.
- Reflejo inmediato en la vista pública sin tocar el QR (RF-26).

**Skills**: `nestjs-expert`, `nextjs-developer`, `file-upload-testing`, `image-processing-testing`, `react-testing-library`, `playwright-e2e`.

**Pruebas unitarias**: reglas de negocio de variantes/extras, cálculo de orden tras reordenar, no disponibilidad no afecta el registro (solo la visibilidad pública).

**Pruebas e2e**: crear categoría → producto → variante → extra → marcar no disponible (verificar que desaparece de `/{slug}`) → eliminar definitivo.

**Pausa**: reviso contigo la gestión de productos antes de seguir.

---

## Fase 6 — Código QR y vista pública del menú

**Objetivo**: RF-27 a RF-32.

**Tareas clave**:
- Generación automática de QR único al crear el restaurante (Fase 2), apuntando a `dominio.com/{slug}`; descargable en PNG y SVG.
- Garantizar que el QR nunca se regenera por cambios posteriores (contenido, nombre visible).
- Vista pública mobile-first: solo productos disponibles, navegación por categorías, sin login, solo lectura (RNF-05).
- Verificación de slugs reservados en el enrutamiento (desviación #4).

**Skills**: `nextjs-developer`, `mobile-performance-testing`, `responsive-testing-automation`, `lighthouse-performance`, `web-vitals-testing`, `webapp-testing`, `playwright-e2e`.

**Pruebas unitarias**: el QR no cambia su payload ante ediciones del menú o del nombre; descarga en ambos formatos.

**Pruebas e2e**: recorrido completo simulando el escaneo del QR (navegar a `/{slug}`), verificar que solo aparecen productos disponibles, verificar que un restaurante deshabilitado no muestra el menú, chequeo de rendimiento/responsive en viewport móvil.

**Pausa**: reviso contigo la vista pública y el QR antes de seguir.

---

## Fase 7 — Estadísticas de visualización

**Objetivo**: RF-33 a RF-39.

**Tareas clave**:
- Registro de vista en la vista pública, deduplicada por **IP + fecha** (día), sin impacto perceptible en la carga (RNF-04) — se registra de forma asíncrona/no bloqueante.
- Endpoints de estadísticas (dueño y admin): vistas únicas 7 días / 30 días / todo el tiempo; promedio por hora del día (0–23h); promedio por día de la semana — todo en **hora de Perú (UTC-5)**, independiente de la zona del servidor.
- Job programado de retención: mantiene detalle granular (`ViewEvent`) 30 días y agrega el resto a `ViewSummary` para sostener el conteo histórico (RF-39).
- UI de estadísticas en panel del dueño y backoffice.

**Skills**: `timezone-bug-hunter`, `database-schema-designer`, `cron-job-testing`, `nestjs-expert`, `nextjs-developer`, `dataviz`, `performance-budget-testing`.

**Pruebas unitarias**: cálculo de agregados por hora/día de semana en UTC-5 (casos límite alrededor de medianoche), deduplicación por IP+día (misma IP mismo día no incrementa, día siguiente sí), job de retención mueve correctamente datos >30 días a resúmenes.

**Pruebas e2e**: simular varias vistas del mismo visitante en un día (conteo no sube), estadísticas visibles y correctas en panel del dueño y en backoffice con datos sembrados.

**Pausa**: reviso contigo las estadísticas antes de seguir.

---

## Fase 8 — Despliegue en el VPS con Dokploy

**Objetivo**: llevar el sistema a producción sobre la infraestructura ya disponible.

**Tareas clave**:
- `compose.yml` de producción final (postgres + api + web + volumen persistente de imágenes).
- Variables de entorno de producción (dominio real, Gemini API key, secrets JWT).
- Despliegue en el VPS vía Dokploy, verificación de health checks.
- Smoke test end-to-end en producción: crear restaurante de prueba → digitalizar carta → escanear QR real → ver vista pública → generar una vista → verificar en estadísticas.

**Skills**: `docker-testing`, `production-smoke-suite`, `synthetic-monitoring`.

**Pruebas**: smoke test manual/automatizado sobre el entorno de producción real; verificación de que el volumen de imágenes persiste tras reiniciar el contenedor.

**Pausa**: última fase — reviso contigo el sistema en producción.

---

## Verificación final end-to-end (post Fase 8)

Recorrido completo en producción: WhatsApp → alta manual en backoffice → login del dueño → digitalización de carta con fotos reales → ajuste manual de un producto → descarga e impresión (o escaneo desde celular) del QR → visualización del menú público desde un celular real → confirmación de que la vista quedó registrada en las estadísticas del dueño y del backoffice.
