import type { Locale } from '@/i18n/locale';

export interface OwnerTutorial {
  /** Matches the recorded asset under public/tutorials, kept for the future re-recording. */
  id: string;
  description: string;
  destination: { href: string; label: string } | null;
  /** Button names are quoted exactly as the interface shows them, in the same language. */
  steps: string[];
  title: string;
}

export const ownerTutorials: Record<Locale, OwnerTutorial[]> = {
  en: [
    {
      description: 'Sign in with your credentials and find the main sections.',
      destination: null,
      id: '01-access',
      steps: [
        "Open the link Sirio sent you and add the page to your phone's home screen.",
        'Enter the email and password you received when your restaurant was set up.',
        "Once inside, you'll see five tabs at the bottom: Profile, Menu, QR, Statistics and Help.",
        "If you forgot your password, message us on WhatsApp and we'll reset it.",
      ],
      title: 'Sign in to your panel',
    },
    {
      description: 'Add your logo and the contact details your customers will see.',
      destination: { href: '/admin', label: 'Go to Profile' },
      id: '02-profile',
      steps: [
        'Go to Profile and tap “Upload logo”. PNG, JPG or WebP files up to 2 MB are accepted.',
        'Fill in your phone, WhatsApp and address: they are how people find you.',
        'Add your social links in full, starting with https://.',
        'Tap “Save profile”. The progress bar shows how many details you have filled in.',
      ],
      title: 'Complete your profile',
    },
    {
      description: 'Turn clear photos of your menu into an editable draft.',
      destination: { href: '/admin/menu', label: 'Go to Menu' },
      id: '03-digitize',
      steps: [
        "Go to Menu and tap “Select photos”. You can use your phone's camera.",
        'Photograph each full page, in good light and with the text in focus.',
        'Send 1 to 5 photos, up to 3 MB each and 12 MB in total.',
        'Tap “Digitize into draft” and wait. Sirio does not store your photos.',
        'Review the result: you can fix any dish, price or section.',
      ],
      title: 'Digitize your menu',
    },
    {
      description: 'Check your changes and update your public menu.',
      destination: { href: '/admin/menu', label: 'Go to Menu' },
      id: '04-publish',
      steps: [
        'Everything you edit stays in a draft: your customers keep seeing the previous menu.',
        "Pick a template if you want to change the draft's colors and typography.",
        'Tap “Preview draft” to see it exactly as your customers will.',
        "When you're happy, tap “Publish menu” (or “Publish changes”) and confirm. The QR link stays the same.",
        'To take a dish off the menu without deleting it, tap “Mark unavailable” and publish.',
      ],
      title: 'Review and publish',
    },
    {
      description: 'Download, test and share your permanent code.',
      destination: { href: '/admin/qr', label: 'Go to QR' },
      id: '05-qr',
      steps: [
        'Go to QR and tap “Download PNG” for digital use or “Download SVG” for print.',
        'Scan it with your own phone to check that it opens your menu.',
        "Print it just once: the code doesn't change when you edit dishes or prices.",
        'Tap “Copy link” to share it on WhatsApp or social media.',
      ],
      title: 'Share your QR code',
    },
  ],
  es: [
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
        'Cuando estés conforme, toca “Publicar carta” (o “Publicar cambios”) y confirma. El enlace del QR no cambia.',
        'Para retirar un plato sin borrarlo, toca “Marcar no disponible” y publica.',
      ],
      title: 'Revisa y publica',
    },
    {
      description: 'Descarga, prueba y comparte el código permanente.',
      destination: { href: '/admin/qr', label: 'Ir a QR' },
      id: '05-qr',
      steps: [
        'Entra a QR y toca “Descargar PNG” para uso digital o “Descargar SVG” para imprenta.',
        'Escanéalo con tu propio celular para comprobar que abre tu carta.',
        'Imprímelo una sola vez: el código no cambia aunque edites platos o precios.',
        'Toca “Copiar enlace” para compartirlo por WhatsApp o redes.',
      ],
      title: 'Comparte tu QR',
    },
  ],
};
