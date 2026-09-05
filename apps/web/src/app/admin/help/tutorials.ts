export interface OwnerTutorial {
  /** Matches the recorded asset under public/tutorials, kept for the future re-recording. */
  id: string;
  description: string;
  destination: { href: string; label: string } | null;
  steps: string[];
  title: string;
}

export const ownerTutorials: OwnerTutorial[] = [
  {
    description: 'Accede con tus credenciales y ubica las secciones principales.',
    destination: null,
    id: '01-access',
    steps: [
      'Abre el enlace que te envió Sirio y guarda la página en la pantalla de inicio de tu celular.',
      'Escribe el correo y la contraseña que recibiste al dar de alta tu restaurante.',
      'Al entrar verás abajo cinco accesos: Perfil, Carta, QR, Estadísticas y Ayuda.',
      'Si olvidaste tu contraseña, escríbenos por WhatsApp y la restablecemos.',
    ],
    title: 'Ingresa a tu panel',
  },
  {
    description: 'Añade tu logo y los datos de contacto que verán los clientes.',
    destination: { href: '/admin', label: 'Ir a Perfil' },
    id: '02-profile',
    steps: [
      'Entra a Perfil y toca “Subir logo”. Acepta PNG, JPG o WebP de hasta 2 MB.',
      'Completa teléfono, WhatsApp y dirección: son los datos con los que te ubican.',
      'Agrega tus redes con el enlace completo, empezando por https://.',
      'Toca “Guardar perfil”. La barra de progreso te indica cuántos datos llevas.',
    ],
    title: 'Completa tu perfil',
  },
  {
    description: 'Convierte fotos claras de tu menú en un borrador editable.',
    destination: { href: '/admin/menu', label: 'Ir a Carta' },
    id: '03-digitize',
    steps: [
      'Entra a Carta y toca “Seleccionar fotografías”. Puedes usar la cámara del celular.',
      'Fotografía cada página completa, con buena luz y el texto enfocado.',
      'Envía entre 1 y 5 fotos, de hasta 3 MB cada una y 12 MB en total.',
      'Toca “Digitalizar en borrador” y espera. Las fotos no se guardan en Sirio.',
      'Revisa el resultado: puedes corregir cualquier plato, precio o sección.',
    ],
    title: 'Digitaliza tu carta',
  },
  {
    description: 'Valida los cambios y actualiza la carta pública.',
    destination: { href: '/admin/menu', label: 'Ir a Carta' },
    id: '04-publish',
    steps: [
      'Todo lo que editas queda en borrador: tus clientes siguen viendo la carta anterior.',
      'Elige una plantilla si quieres cambiar colores y tipografía del borrador.',
      'Toca “Previsualizar borrador” para verlo tal como lo verá tu cliente.',
      'Cuando estés conforme, toca “Publicar” y confirma. El enlace del QR no cambia.',
      'Para retirar un plato sin borrarlo, márcalo como no disponible y publica.',
    ],
    title: 'Revisa y publica',
  },
  {
    description: 'Descarga, prueba y comparte el código permanente.',
    destination: { href: '/admin/qr', label: 'Ir a QR' },
    id: '05-qr',
    steps: [
      'Entra a QR y descarga el código: PNG para uso digital, SVG para imprenta.',
      'Escanéalo con tu propio celular para comprobar que abre tu carta.',
      'Imprímelo una sola vez: el código no cambia aunque edites platos o precios.',
      'Copia el enlace permanente para compartirlo por WhatsApp o redes.',
    ],
    title: 'Comparte tu QR',
  },
];
