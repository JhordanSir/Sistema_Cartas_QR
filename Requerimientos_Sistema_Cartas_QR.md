# Documento de Requerimientos de Software

## Sistema de Digitalización de Cartas de Restaurantes con QR Dinámico

**Sirio Automatiza**
Versión 1.2 — Agosto 2026

> Cambios v1.2: se agrega módulo de estadísticas de visualización de la carta (vistas por 7/30/todo el tiempo, promedio por hora del día, promedio por día de la semana) y se documenta el cambio de contraseña del dueño de forma explícita en su propia sección.
> Cambios v1.1: flujo de registro vía WhatsApp, autenticación por correo/contraseña, slugs de URL pública, deshabilitación/reactivación y eliminación definitiva de restaurantes.

---

## 1. Introducción

### 1.1 Propósito del documento

Este documento define los requerimientos funcionales y no funcionales del sistema de digitalización de cartas de restaurantes, con el fin de servir como base para el diseño, desarrollo y validación de la solución. Su objetivo es dejar explícitas las reglas de negocio y evitar supuestos o vacíos de interpretación durante la construcción del sistema.

### 1.2 Descripción general del sistema

El sistema permite a los dueños de restaurantes digitalizar su carta física (mediante fotografías) para obtener una versión web de su menú, accesible por sus clientes a través de un código QR fijo. El QR se genera una única vez por restaurante y permanece inmutable durante todo el ciclo de vida del negocio, sin importar cuántas veces se editen los productos, precios o categorías. El contenido del menú se resuelve de forma dinámica desde una base de datos cada vez que un cliente escanea el código, de modo que las actualizaciones se reflejan de inmediato sin necesidad de reimprimir o regenerar el QR.

La digitalización de la carta se realiza mediante un modelo de inteligencia artificial (API de Gemini) que extrae de la(s) fotografía(s) de la carta el texto estructurado (categorías, productos, descripciones, precios y variantes), además de una estimación del estilo visual (colores y tipografía aproximada) para recrear una plantilla web fiel al estilo original del restaurante (Enfoque B: plantilla clonada, no imagen editada).

El sistema se concibe inicialmente como aplicación web. Se contempla como evolución futura un aplicativo móvil nativo para los dueños de restaurante, por lo que la arquitectura del backend debe exponerse mediante una API reutilizable por distintos clientes (web y, más adelante, móvil), aunque el desarrollo de dicho aplicativo queda fuera del alcance de este documento.

Adicionalmente, el sistema debe registrar las visitas a cada carta pública para ofrecer al dueño (y al administrador) estadísticas de visualización que ayuden a entender el comportamiento de sus clientes.

El sistema está compuesto por tres frentes principales:

- **Panel de administración del restaurante**: donde el dueño digitaliza su carta, gestiona productos, precios, disponibilidad, su contraseña y consulta las estadísticas de visualización de su carta.
- **Vista pública del menú**: la página que ve el cliente final al escanear el QR, optimizada para uso móvil.
- **Panel de administración general (backoffice)**: donde el operador de la plataforma (Sirio Automatiza) da de alta, deshabilita, reactiva y elimina restaurantes, y puede consultar las estadísticas de cualquiera de ellos.

---

## 2. Alcance

### 2.1 Incluido en el MVP

- Alta de restaurantes exclusivamente por el administrador de la plataforma (backoffice), a partir de un contacto previo del dueño por WhatsApp. No existe formulario público de autorregistro.
- Autenticación del dueño de restaurante mediante correo electrónico y contraseña, con posibilidad de cambiar su contraseña desde su panel.
- Digitalización de la carta a partir de una o varias fotografías (cartas de múltiples páginas).
- Extracción automática de categorías, productos, descripciones y precios mediante IA (Gemini API), con publicación directa sin paso de revisión previa obligatorio.
- Generación de una plantilla visual (colores y tipografía aproximada al estilo detectado en la foto original).
- Gestión de productos con variantes (por ejemplo, tamaños S/M/L con precios distintos) y adicionales/extras.
- Edición de productos: alta, edición de precio y descripción, ocultar temporalmente (marcar como no disponible) y eliminación definitiva.
- Generación de un código QR único y permanente por restaurante, apuntando a una URL pública legible del tipo `dominio.com/{nombre-del-restaurante}`.
- Vista pública del menú, responsiva y optimizada para dispositivos móviles, sin necesidad de login.
- Reflejo inmediato de los cambios guardados en el panel de administración hacia la vista pública, sin alterar el QR.
- Deshabilitación y reactivación de un restaurante por parte del administrador (por ejemplo, por falta de pago).
- Eliminación definitiva de un restaurante por parte del administrador, incluyendo el borrado de sus archivos e imágenes asociados, con confirmación explícita previa por tratarse de una acción irreversible.
- **Estadísticas de visualización de la carta**, disponibles para el dueño en su panel y para el administrador en el backoffice:
  - Número de vistas únicas en los últimos 7 días, 30 días y desde el inicio del restaurante ("todo el tiempo").
  - Promedio de vistas por hora del día (0–23h, hora de Perú), para identificar las horas pico.
  - Promedio de vistas por día de la semana (lunes a domingo, hora de Perú).

### 2.2 Fuera de alcance del MVP (fases futuras)

- Aplicativo móvil nativo para dueños de restaurante (se deja como evolución futura; el backend debe diseñarse pensando en soportarlo).
- Formulario público de autorregistro (self-service) para dueños de restaurante.
- Soporte multi-idioma en la vista pública del menú (MVP en español únicamente).
- Pasarela de pago integrada para el cobro de suscripciones (en el MVP el cobro se gestiona manualmente, fuera del sistema).
- Paso de revisión/aprobación de la carta digitalizada antes de su publicación.
- Analítica avanzada adicional (ej. productos más vistos, mapa de calor de escaneos, comparación entre restaurantes) — solo se documentan como requerimiento las tres métricas listadas en el alcance del MVP.
- Exportación del menú a PDF descargable.
- Modo de "alta fidelidad" (Enfoque A: imagen original con parches editables).

---

## 3. Actores del sistema

| Actor | Descripción |
|---|---|
| **Dueño de restaurante** | Contacta por WhatsApp para solicitar su alta. Una vez creada su cuenta por el administrador, inicia sesión con correo y contraseña, digitaliza su carta, gestiona productos, disponibilidad, su propia contraseña y consulta las estadísticas de visualización de su carta. |
| **Cliente final** | Escanea el QR en el restaurante y visualiza el menú digital público, sin necesidad de autenticarse. |
| **Administrador de plataforma** | Personal de Sirio Automatiza. Da de alta restaurantes manualmente (backoffice) tras el contacto por WhatsApp, puede deshabilitar, reactivar o eliminar definitivamente un restaurante, y consultar las estadísticas de visualización de cualquier restaurante. |

---

## 4. Requerimientos funcionales

### 4.1 Registro, autenticación y gestión de restaurantes

| ID | Requerimiento |
|---|---|
| RF-01 | El sistema no debe exponer un formulario público de autorregistro. La única vía para solicitar una cuenta es contactar al número de WhatsApp **+51 973 502 261**, publicado visiblemente en el sitio. |
| RF-02 | El administrador de la plataforma debe poder crear manualmente la cuenta de un restaurante desde el backoffice, incluyendo correo electrónico y contraseña inicial del dueño. |
| RF-03 | El dueño de restaurante debe autenticarse en el panel de administración mediante correo electrónico y contraseña. |
| RF-04 | El dueño debe poder cambiar su propia contraseña desde su panel de administración, ingresando su contraseña actual y la nueva contraseña. |
| RF-05 | El sistema debe permitir recuperar el acceso en caso de olvido de contraseña, mediante el correo electrónico registrado del dueño. |
| RF-06 | Cada restaurante debe tener un identificador único e inmutable a nivel de base de datos, generado automáticamente al momento de su creación, independiente del nombre visible o del slug de la URL. |
| RF-07 | El sistema debe generar un slug (identificador legible para la URL pública) a partir del nombre del restaurante, normalizado en minúsculas, sin tildes ni caracteres especiales y con guiones en lugar de espacios. |
| RF-08 | Si el slug generado ya existe, el sistema debe agregar automáticamente un sufijo numérico incremental para garantizar unicidad (ej. `/pizza-felix`, `/pizza-felix-2`). |
| RF-09 | El sistema debe permitir registrar los datos básicos del restaurante: nombre, logo y datos de contacto. |
| RF-10 | El administrador debe poder deshabilitar un restaurante. Al deshabilitarlo, la vista pública del menú deja de mostrarse (el QR ya no muestra la carta), pero el dueño conserva acceso a su panel de administración. |
| RF-11 | El administrador debe poder reactivar en cualquier momento un restaurante previamente deshabilitado, restableciendo la visibilidad de su vista pública sin cambiar su QR ni su URL. |
| RF-12 | El administrador debe poder eliminar de forma definitiva un restaurante. Esta acción debe requerir una confirmación explícita adicional antes de ejecutarse, por ser irreversible. |
| RF-13 | Al eliminar definitivamente un restaurante, el sistema debe borrar sus archivos e imágenes asociados (fotos de carta, logo, imágenes de productos) para liberar espacio de almacenamiento, junto con sus registros en base de datos, incluyendo su historial de estadísticas. |

### 4.2 Digitalización de la carta

| ID | Requerimiento |
|---|---|
| RF-14 | El sistema debe permitir subir una o varias fotografías de la carta física (soporte para cartas de múltiples páginas). |
| RF-15 | El sistema debe procesar la(s) imagen(es) mediante la API de Gemini para extraer de forma estructurada: categorías, nombre de producto, descripción, precio y variantes/adicionales cuando existan. |
| RF-16 | El sistema debe estimar a partir de la imagen un color de fondo, color de texto y una tipografía aproximada (Google Font similar), para aplicarlos automáticamente a la plantilla generada. |
| RF-17 | El resultado de la digitalización se publica directamente en la vista pública del restaurante, sin requerir un paso de aprobación previa. |
| RF-18 | El dueño debe poder corregir manualmente, en cualquier momento posterior a la publicación, cualquier dato mal interpretado por la IA (nombre, precio, categoría, descripción, colores). |

### 4.3 Gestión de productos

| ID | Requerimiento |
|---|---|
| RF-19 | El sistema debe permitir crear, editar y eliminar categorías del menú. |
| RF-20 | El sistema debe permitir crear, editar y eliminar productos dentro de una categoría. |
| RF-21 | Un producto debe poder tener variantes (por ejemplo, tamaños) cada una con su propio precio. |
| RF-22 | Un producto debe poder tener adicionales/extras opcionales, cada uno con su propio precio adicional. |
| RF-23 | El sistema debe permitir marcar un producto como "no disponible" sin eliminarlo, ocultándolo temporalmente de la vista pública. |
| RF-24 | El sistema debe permitir eliminar un producto de forma definitiva. |
| RF-25 | El sistema debe permitir reordenar categorías y productos dentro de una categoría. |
| RF-26 | Todo cambio guardado en el panel de administración debe reflejarse de inmediato en la vista pública del menú, sin requerir regenerar el código QR. |

### 4.4 Código QR y vista pública

| ID | Requerimiento |
|---|---|
| RF-27 | El sistema debe generar automáticamente un código QR único por restaurante en el momento de su creación, apuntando a la URL pública fija `dominio.com/{slug-del-restaurante}`. |
| RF-28 | El código QR generado debe poder descargarse como imagen (PNG o SVG) para su impresión. |
| RF-29 | El código QR no debe regenerarse ni modificarse por ningún cambio posterior en el contenido del menú, ni por la edición del nombre visible del restaurante (el slug de la URL, una vez asignado, se mantiene estable). |
| RF-30 | La vista pública del menú debe ser accesible sin necesidad de inicio de sesión, mientras el restaurante esté habilitado. |
| RF-31 | La vista pública debe mostrar únicamente los productos marcados como disponibles. |
| RF-32 | La vista pública debe estar optimizada para dispositivos móviles (diseño mobile-first), con navegación intuitiva por categorías. |

### 4.5 Estadísticas de visualización

| ID | Requerimiento |
|---|---|
| RF-33 | El sistema debe registrar cada visita a la vista pública de un restaurante, contando como **una vista única por día** por dispositivo/IP (visitas repetidas del mismo visitante en el mismo día no incrementan el conteo). |
| RF-34 | El dueño debe poder ver, desde su panel, el número de vistas únicas de su carta en los últimos **7 días**, en los últimos **30 días**, y **desde el inicio** ("todo el tiempo"). |
| RF-35 | El dueño debe poder ver el **promedio de vistas por hora del día** (franjas de 0 a 23 horas), calculado en base al historial disponible, para identificar las horas de mayor consulta. |
| RF-36 | El dueño debe poder ver el **promedio de vistas por día de la semana** (lunes a domingo), calculado en base al historial disponible. |
| RF-37 | El administrador debe poder ver, desde el backoffice, las mismas estadísticas (RF-34 a RF-36) de cualquier restaurante. |
| RF-38 | Todos los cálculos de estadísticas (agrupación por hora del día y por día de la semana) deben realizarse en base a la **zona horaria de Perú (UTC-5)**. |
| RF-39 | El sistema debe conservar el detalle diario/horario de vistas de los **últimos 30 días**. El historial más antiguo se conserva de forma resumida (totales agregados) para sostener el conteo de "todo el tiempo", sin mantener el detalle granular indefinidamente. |

---

## 5. Requerimientos no funcionales

| ID | Requerimiento |
|---|---|
| RNF-01 | **Reactividad**: la interfaz debe ser responsiva y priorizar la experiencia en dispositivos móviles, tanto en el panel de administración como en la vista pública. |
| RNF-02 | **Usabilidad**: la edición de productos (precio, disponibilidad) debe poder completarse en pocos pasos, sin curva de aprendizaje para un usuario no técnico. |
| RNF-03 | **Disponibilidad**: la vista pública del menú debe estar accesible en todo momento (alta disponibilidad) mientras el restaurante esté habilitado, dado que se accede directamente desde las mesas del restaurante. |
| RNF-04 | **Rendimiento**: la vista pública debe cargar rápidamente incluso en conexiones móviles limitadas; el registro de una vista (RF-33) no debe percibirse como un retraso en la carga de la página. |
| RNF-05 | **Seguridad**: las contraseñas de los dueños y administradores deben almacenarse con hash seguro (no en texto plano); el panel de administración debe requerir autenticación; la vista pública debe ser de solo lectura. |
| RNF-06 | **Persistencia del identificador**: el identificador único interno del restaurante y su slug de URL, una vez creados, deben garantizarse estables a nivel de base de datos. |
| RNF-07 | **Escalabilidad**: la arquitectura debe soportar múltiples restaurantes (multi-tenant) sobre la misma infraestructura. |
| RNF-08 | **Preparación para múltiples clientes**: el backend debe exponerse como API independiente de la interfaz web, para permitir en el futuro un aplicativo móvil sin rediseñar la lógica de negocio. |
| RNF-09 | **Integridad ante borrado**: la eliminación definitiva de un restaurante debe borrar de forma consistente sus registros en base de datos, sus archivos físicos (imágenes) y su historial de estadísticas, sin dejar datos huérfanos. |
| RNF-10 | **Privacidad en el registro de vistas**: el conteo de vistas únicas no debe almacenar información personal identificable del cliente final más allá de lo estrictamente necesario para deduplicar visitas del mismo día (ej. IP/dispositivo con retención acotada). |

---

## 6. Modelo de datos (alto nivel)

A continuación se listan las entidades principales identificadas. El detalle de campos, tipos y relaciones se define en la etapa de diseño técnico.

- **Restaurant**: identificador único interno, slug de URL (único), nombre, logo, datos de contacto, estilo visual (colores, tipografía), estado (habilitado / deshabilitado).
- **Category**: pertenece a un restaurante; nombre, orden.
- **Product**: pertenece a una categoría; nombre, descripción, precio base, disponibilidad, orden.
- **ProductVariant**: pertenece a un producto; nombre de variante (ej. tamaño), precio.
- **ProductExtra**: pertenece a un producto; nombre del adicional, precio adicional.
- **Usuario (dueño)**: correo electrónico, contraseña (hash), asociado a uno o más restaurantes.
- **Usuario administrador (backoffice)**: correo electrónico, contraseña (hash), acceso a nivel plataforma.
- **ViewEvent / RegistroDeVista**: pertenece a un restaurante; fecha (día), hora, identificador de deduplicación (dispositivo/IP) — detalle conservado por 30 días.
- **ViewSummary / ResumenDeVistas**: pertenece a un restaurante; totales agregados por día/hora más allá de la ventana de 30 días, usados para el conteo histórico de "todo el tiempo".

---

## 7. Flujos principales

### 7.1 Solicitud de alta y creación de restaurante

1. El interesado escribe al WhatsApp **+51 973 502 261** solicitando el servicio.
2. El administrador coordina con el dueño y crea la cuenta del restaurante desde el backoffice (correo y contraseña inicial).
3. El sistema genera el identificador único interno, el slug de la URL pública (a partir del nombre, resolviendo duplicados con sufijo automático) y el código QR asociado.
4. El administrador entrega las credenciales al dueño para que acceda a su panel.

### 7.2 Digitalización de la carta

1. El dueño inicia sesión con su correo y contraseña.
2. Sube una o varias fotografías de su carta física.
3. El sistema procesa las imágenes con la API de Gemini y extrae categorías, productos, precios, variantes y estilo visual.
4. El sistema publica automáticamente el menú digital, sin revisión previa.
5. El dueño descarga el QR generado para imprimirlo y colocarlo en el restaurante.

### 7.3 Edición de productos y de contraseña

1. El dueño inicia sesión en el panel de administración.
2. Selecciona un producto y modifica su precio, descripción, disponibilidad, variantes o adicionales — o accede a su perfil para cambiar su contraseña (ingresando la actual y la nueva).
3. Guarda los cambios.
4. El sistema actualiza la base de datos; la vista pública refleja el cambio de inmediato, sin alterar el QR ni la URL existentes.

### 7.4 Consulta del menú por el cliente final

1. El cliente escanea el código QR en el restaurante.
2. El sistema resuelve la URL fija `dominio.com/{slug}` y consulta el estado actual del menú en la base de datos.
3. Si el restaurante está habilitado, se muestra la vista pública con los productos disponibles y se registra la vista (deduplicada por día) para efectos estadísticos. Si está deshabilitado, no se muestra el menú.

### 7.5 Consulta de estadísticas

1. El dueño (o el administrador, desde el backoffice) accede a la sección de estadísticas del restaurante.
2. El sistema muestra: vistas únicas de los últimos 7 días, 30 días y desde el inicio; promedio de vistas por hora del día; y promedio de vistas por día de la semana — todo calculado en hora de Perú (UTC-5).

### 7.6 Deshabilitación, reactivación y eliminación de un restaurante

1. El administrador ubica al restaurante en el backoffice.
2. Para deshabilitar: confirma la acción; el menú público deja de mostrarse, pero el dueño conserva acceso a su panel.
3. Para reactivar: confirma la acción; el menú público vuelve a mostrarse de inmediato, sin cambios en el QR ni la URL.
4. Para eliminar definitivamente: el sistema solicita una confirmación explícita adicional; al confirmarse, se borran los registros del restaurante, su historial de estadísticas y todos sus archivos e imágenes asociados de forma permanente.

---

## 8. Supuestos y restricciones

- La precisión de la extracción automática depende de la calidad y legibilidad de la fotografía de la carta original.
- El sistema no valida ni corrige automáticamente errores de la IA; la corrección queda a cargo del dueño del restaurante, de forma posterior a la publicación.
- El cobro de las suscripciones a los restaurantes se gestiona manualmente fuera del sistema en esta primera versión; la deshabilitación por falta de pago es una acción manual del administrador.
- El sistema se despliega sobre infraestructura propia (VPS con Dokploy), en modalidad multi-tenant.
- El idioma de la plataforma y del menú público es español en esta primera versión.
- El número de WhatsApp de contacto para solicitudes de alta es **+51 973 502 261**.
- El slug de la URL pública, una vez asignado a un restaurante, se considera estable; un cambio de nombre visible del restaurante no debe alterar automáticamente el slug ni el QR ya impreso.
- Una "vista única" se define por día y por dispositivo/IP; el mismo cliente puede volver a contar como vista al día siguiente.
- El detalle granular de vistas (por hora) se conserva 30 días; más allá de ese periodo, solo se mantienen totales agregados, suficientes para el conteo histórico pero no para recalcular patrones horarios de fechas antiguas.
- Los cálculos de hora del día y día de la semana usan la zona horaria de Perú (UTC-5), independientemente de dónde se aloje el servidor.

---

## 9. Glosario

| Término | Definición |
|---|---|
| **QR dinámico de contenido fijo** | Código QR que apunta a una URL fija por restaurante; el contenido que muestra esa URL puede cambiar sin que el QR se modifique. |
| **Slug** | Identificador legible derivado del nombre del restaurante, usado en la URL pública (`dominio.com/{slug}`); único por restaurante. |
| **Enfoque B (plantilla clonada)** | Estrategia de digitalización donde se recrea el estilo visual de la carta original (colores, tipografía) usando texto real editable, en lugar de conservar la fotografía original como fondo. |
| **Backoffice** | Panel de administración interno usado por el operador de la plataforma (Sirio Automatiza) para gestionar restaurantes: alta, deshabilitación, reactivación, eliminación y consulta de estadísticas. |
| **Variante de producto** | Versión de un mismo producto con un precio distinto, típicamente por tamaño (ej. S/M/L). |
| **Adicional/Extra** | Ítem opcional que se puede agregar a un producto con un costo adicional. |
| **Vista única** | Visita a la carta pública de un restaurante contada una sola vez por día para un mismo dispositivo/IP, usada como unidad base de las estadísticas de visualización. |
