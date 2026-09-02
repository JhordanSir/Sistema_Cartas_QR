# Sistema visual de Sirio Automatiza

## Dirección

Sirio es la mesa de trabajo de un restaurante: cálida como una carta impresa, directa como una comanda y fiable como un QR permanente. La plataforma usa un fondo de papel, contenido de alta legibilidad y acentos que comunican acción, no decoración.

## Tokens

- `--canvas`: #F7F1E7 (mantel de papel)
- `--paper`: #FFFDF8 (carta)
- `--ink`: #29271F (tinta)
- `--olive`: #315B45 (acción principal / disponible)
- `--copper`: #B75B38 (énfasis editorial)
- `--teal`: #1598A6 (firma de Sirio)
- Base de espaciado: 4 px; controles: mínimo 44 px; radio: 8 / 12 / 20 px.

## Tipografía y profundidad

- Titulares: Playfair Display, con una escala editorial y espaciado negativo moderado.
- UI: Manrope, peso y color para jerarquía antes que tamaño.
- Profundidad: superficies claras con bordes tenues y sombras de tres capas; nunca bordes duros ni sombras dramáticas.

## Patrones

- Un CTA principal por pantalla; las acciones secundarias se muestran como borde o texto.
- Navegación con etiqueta, icono y estado actual con `aria-current="page"`.
- Estados de carga, éxito y error usan lenguaje claro y conservan el contexto de la tarea.
- El motivo distintivo es la **carta de servicio**: pasos breves y marcas de publicación que conectan cocina, carta y mesa.
- La **orden de publicación** concentra estado (borrador / en vivo), plantilla, previsualización y confirmación explícita; el enlace QR se declara permanente en cada transición.
- La **carta de mesa** muestra primero nombre, secciones y precios: usa un índice pegajoso solo si hay más de una sección, y cabeceras numeradas para mantener la orientación al desplazarse.
- El **folio operativo** convierte cada local del backoffice en un registro trazable: estado, propietario, acceso directo a la carta y acciones se leen en una sola línea de trabajo.
