import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = resolve(projectRoot, 'compositions', 'frames');

const frames = [
  ['01-panel', 'Tutorial 1 · Acceso', 'Tu carta empieza aquí', 'Todo lo que necesitas está en tu panel.', ['Logo Sirio', 'Panel del restaurante', 'Vista móvil']],
  ['02-login-screen', 'Tutorial 1 · Acceso', 'Abre el acceso', 'Ingresa con las credenciales de tu restaurante.', ['Correo', 'Contraseña', 'Entrar a mi restaurante']],
  ['03-credentials', 'Tutorial 1 · Acceso', 'Completa tus datos', 'Usa tu correo y contraseña personales.', ['hola@restaurante.pe', '••••••••', 'Entrar a mi restaurante']],
  ['04-navigation', 'Tutorial 1 · Acceso', 'Reconoce tu panel', 'Encuentra las secciones principales.', ['◇ Perfil', '≡ Carta', '⌗ QR', '◔ Estadísticas']],
  ['05-ready', 'Tutorial 1 · Acceso', 'Ya estás dentro', 'Siguiente: completa tu perfil.', ['Perfil', 'Información para clientes', 'Continuar']],
  ['06-identity', 'Tutorial 2 · Perfil', 'Haz que te reconozcan', 'Tu identidad aparece junto a tu carta.', ['Logo', 'Nombre del restaurante', 'Datos de contacto']],
  ['07-open-profile', 'Tutorial 2 · Perfil', 'Abre Perfil', 'Encuentra esta sección en tu navegación.', ['◇ Perfil', 'Tu perfil', 'Así te verán']],
  ['08-upload-logo', 'Tutorial 2 · Perfil', 'Sube tu logo', 'Revisa la imagen antes de guardar.', ['Subir logo', 'PNG · JPG · WebP', 'Vista previa']],
  ['09-contact-fields', 'Tutorial 2 · Perfil', 'Agrega tus datos', 'Ayuda a tus clientes a encontrarte.', ['Teléfono', 'WhatsApp', 'Dirección']],
  ['10-save-profile', 'Tutorial 2 · Perfil', 'Guarda tu perfil', 'Tus redes son opcionales.', ['Instagram', 'Facebook · TikTok', 'Guardar perfil']],
  ['11-menu-digitization', 'Tutorial 3 · Carta', 'Convierte tu carta', 'Pasa de fotos a un borrador digital.', ['Foto de carta', 'Categorías', 'Platos y precios']],
  ['12-open-menu', 'Tutorial 3 · Carta', 'Abre Carta', 'Prepara una nueva versión de tu menú.', ['≡ Carta', 'Carta del restaurante', 'Tu borrador']],
  ['13-photo-quality', 'Tutorial 3 · Carta', 'Fotografía con claridad', 'Buena luz y cada página completa.', ['✕ Oscura o inclinada', '✓ Nítida y completa', 'Texto enfocado']],
  ['14-upload-pages', 'Tutorial 3 · Carta', 'Sube las páginas', 'Selecciona las fotos de tu carta.', ['Página 1', 'Página 2', 'Digitalizar carta']],
  ['15-processing', 'Tutorial 3 · Carta', 'Sirio prepara el borrador', 'Revisa el resultado antes de publicar.', ['Leyendo páginas', 'Reconociendo platos', 'Preparando borrador']],
  ['16-draft-safe', 'Tutorial 3 · Carta', 'Tu QR sigue igual', 'Tus clientes conservan la carta publicada.', ['Borrador', 'Carta pública', 'QR permanente']],
  ['17-review-draft', 'Tutorial 4 · Publicar', 'Revisa antes de publicar', 'Diferencia el borrador de la carta pública.', ['Tu borrador', 'Carta pública', 'QR']],
  ['18-order-categories', 'Tutorial 4 · Publicar', 'Ordena secciones', 'Facilita la lectura desde un teléfono.', ['Entradas', 'Fondos', 'Bebidas']],
  ['19-product-availability', 'Tutorial 4 · Publicar', 'Ajusta cada plato', 'Corrige datos y marca agotados.', ['Nombre y precio', 'Descripción', 'Disponible']],
  ['20-preview', 'Tutorial 4 · Publicar', 'Abre la previsualización', 'Comprueba cómo se leerá tu carta.', ['Previsualizar borrador', 'Carta móvil', 'Categorías y precios']],
  ['21-publish', 'Tutorial 4 · Publicar', 'Publica los cambios', 'Confirma cuando estés conforme.', ['Publicar carta', 'Confirmar publicación', 'Carta actualizada']],
  ['22-public-updated', 'Tutorial 4 · Publicar', 'La carta está al día', 'Ahora puedes compartir tu QR.', ['Carta pública al día', '⌗ QR', 'Siguiente tutorial']],
  ['23-permanent-qr', 'Tutorial 5 · QR', 'Un QR, siempre actualizado', 'Cambia la carta sin reimprimirlo.', ['Código QR', 'Carta actualizada', 'Mismo enlace']],
  ['24-open-qr', 'Tutorial 5 · QR', 'Abre QR', 'Encuentra las opciones para compartir.', ['⌗ QR', 'Tu QR no cambia', 'Listo para imprimir']],
  ['25-download-formats', 'Tutorial 5 · QR', 'Elige un formato', 'Descarga el archivo que necesitas.', ['Descargar PNG', 'Uso rápido', 'Descargar SVG']],
  ['26-copy-link', 'Tutorial 5 · QR', 'Prueba el enlace', 'Copia y abre la dirección permanente.', ['Enlace permanente', 'Copiar enlace', 'Abrir carta pública']],
  ['27-share-qr', 'Tutorial 5 · QR', 'Compártelo donde atiendes', 'El mismo QR funciona en todos tus canales.', ['Mesa', 'Cartel', 'Redes']],
  ['28-close', 'Tutorial 5 · QR', 'Actualiza. Publica. Comparte.', 'Tu carta está lista para cada mesa.', ['Logo Sirio', 'Código QR', 'Carta digital']],
];

function esc(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function createSketch([id, eyebrow, title, description, rows]) {
  const compositionId = `sketch-${id}`;
  const rowMarkup = rows.map((row, index) => `
      <div class="row ${index === rows.length - 1 ? 'row-accent' : ''}">
        <span class="row-index">0${index + 1}</span>
        <span>${esc(row)}</span>
      </div>`).join('');

  return `<!doctype html>
<html lang="es">
  <body>
    <template>
      <div id="${compositionId}" data-composition-id="${compositionId}" data-width="1080" data-height="1920" data-duration="1">
        <style>
          * { box-sizing: border-box; }
          #${compositionId} { width: 1080px; height: 1920px; overflow: hidden; background: #f3f0e8; color: #17231d; font-family: Arial, sans-serif; }
          #${compositionId} .canvas { position: relative; width: 100%; height: 100%; padding: 92px 74px; background: linear-gradient(155deg, #f6f2e8 0%, #e6eee8 100%); }
          #${compositionId} .eyebrow { display: inline-flex; padding: 12px 18px; border: 2px solid #17231d; border-radius: 999px; font-size: 24px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
          #${compositionId} h1 { max-width: 820px; margin: 62px 0 24px; font-size: 82px; line-height: .98; letter-spacing: -.06em; }
          #${compositionId} p { max-width: 780px; margin: 0; color: #435149; font-size: 35px; line-height: 1.2; }
          #${compositionId} .phone { position: absolute; right: 74px; bottom: 96px; left: 74px; height: 960px; padding: 30px; border: 8px solid #17231d; border-radius: 74px; background: #faf8f2; box-shadow: 18px 20px 0 #17231d; }
          #${compositionId} .notch { width: 210px; height: 32px; margin: 0 auto 44px; border-radius: 999px; background: #17231d; }
          #${compositionId} .phone-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 38px; font-size: 24px; font-weight: 700; }
          #${compositionId} .phone-header span:last-child { color: #129a91; }
          #${compositionId} .card { padding: 28px; border: 3px solid #17231d; border-radius: 26px; background: #fffdf8; }
          #${compositionId} .card-label { display: block; margin-bottom: 12px; color: #66746b; font-size: 20px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
          #${compositionId} .card-title { margin: 0 0 32px; font-size: 38px; line-height: 1.05; }
          #${compositionId} .row { display: flex; min-height: 95px; align-items: center; gap: 20px; padding: 18px 0; border-top: 2px solid #d6ddd6; font-size: 29px; font-weight: 650; }
          #${compositionId} .row-index { width: 42px; color: #77847d; font-size: 19px; font-weight: 700; }
          #${compositionId} .row-accent { justify-content: center; border: 0; border-radius: 18px; margin-top: 24px; background: #129a91; color: #fff; }
          #${compositionId} .row-accent .row-index { display: none; }
          #${compositionId} .nav { position: absolute; right: 30px; bottom: 30px; left: 30px; display: flex; justify-content: space-around; padding: 20px 12px; border: 3px solid #17231d; border-radius: 24px; background: #fffdf8; font-size: 20px; font-weight:700; }
          #${compositionId} .tap { position: absolute; right: 114px; bottom: 212px; width: 68px; height: 68px; border: 8px solid #129a91; border-radius: 50%; background: rgba(18,154,145,.15); }
          #${compositionId} .wireframe-note { position: absolute; right: 74px; bottom: 30px; color: #66746b; font-size: 18px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
        </style>
        <div class="canvas">
          <span class="eyebrow">${esc(eyebrow)}</span>
          <h1>${esc(title)}</h1>
          <p>${esc(description)}</p>
          <section class="phone" aria-label="Wireframe de pantalla móvil">
            <div class="notch"></div>
            <div class="phone-header"><span>Sirio</span><span>Vista móvil</span></div>
            <div class="card">
              <span class="card-label">Paso guiado</span>
              <h2 class="card-title">${esc(title)}</h2>${rowMarkup}
            </div>
            <nav class="nav" aria-label="Navegación simulada"><span>Perfil</span><span>Carta</span><span>QR</span></nav>
            <span class="tap" aria-hidden="true"></span>
          </section>
          <span class="wireframe-note">Wireframe · sin animación</span>
        </div>
      </div>
      <script>
        window.__timelines['${compositionId}'] = gsap.timeline({ paused: true });
      </script>
    </template>
  </body>
</html>`;
}

await mkdir(outputDirectory, { recursive: true });
await Promise.all(frames.map(async (frame) => {
  await writeFile(resolve(outputDirectory, `${frame[0]}.html`), createSketch(frame), 'utf8');
}));

console.log(`Generated ${frames.length} storyboard wireframes in ${outputDirectory}`);
