import type { Locale } from '../locale';

interface TitledBody {
  body: string;
  title: string;
}

interface LandingCopy {
  admin: string;
  capabilities: { items: TitledBody[]; kicker: string; title: string };
  footer: { brand: string; tagline: string };
  hero: {
    kicker: string;
    lede: string;
    note: string;
    primary: string;
    secondary: string;
    titleEmphasis: string;
    titleStart: string;
  };
  /** Decorative mock-up of a published menu; hidden from assistive technology. */
  preview: { menu: string; scan: string; section: string };
  questions: { items: Array<{ answer: string; question: string }>; kicker: string; title: string };
  signIn: string;
}

export const landingCopy: Record<Locale, LandingCopy> = {
  en: {
    admin: 'Administration',
    capabilities: {
      items: [
        {
          body: 'Upload a photo of your menu and organize categories, prices, options and images.',
          title: 'Digitize your menu',
        },
        {
          body: 'Print one permanent code so every table reaches the current version of your menu.',
          title: 'Share a single QR',
        },
        {
          body: 'Change availability instantly and see when your guests check the menu.',
          title: 'Update and understand',
        },
      ],
      kicker: 'Everything in its place',
      title: 'A menu that keeps pace with your restaurant.',
    },
    footer: { brand: 'Sirio Automatiza · QR Menus', tagline: 'Update once. Reach every table.' },
    hero: {
      kicker: 'Digital menus for restaurants',
      lede: 'Turn your menu into a clear experience at every table. Guests scan, see the current menu, and you stay in control from one place.',
      note: 'One permanent QR · No apps or downloads for your guests',
      primary: 'Sign in to my restaurant',
      secondary: 'Talk to Sirio',
      titleEmphasis: 'while you serve.',
      titleStart: 'Your menu works',
    },
    preview: { menu: 'Digital menu', scan: 'Scan', section: 'Mains' },
    questions: {
      items: [
        {
          answer:
            'No. The code is printed once and always points to the same address. You can change dishes, prices, photos or the displayed name without reprinting anything.',
          question: 'Does the QR change if I update my menu?',
        },
        {
          answer:
            'No. They scan with their phone camera and the menu opens in the browser, with no downloads or sign-ups.',
          question: 'Do my guests need to install anything?',
        },
        {
          answer:
            'Send one to five photos of your pages and we turn them into an editable draft, with its categories, prices, variants and add-ons. Then you fix whatever needs fixing.',
          question: 'How do I load my menu the first time?',
        },
        {
          answer:
            'You do, from your phone. Every change stays in a draft and only reaches your guests when you confirm publishing, so they never see a half-edited menu.',
          question: 'Who updates the menu afterwards?',
        },
        {
          answer:
            'Mark it as unavailable and it disappears from the menu instantly, keeping its description and price for when it returns.',
          question: 'Can I hide a dish that has sold out?',
        },
      ],
      kicker: 'Before you start',
      title: 'What everyone asks.',
    },
    signIn: 'Sign in',
  },
  es: {
    admin: 'Administración',
    capabilities: {
      items: [
        {
          body: 'Sube una foto de tu carta y organiza categorías, precios, opciones e imágenes.',
          title: 'Digitaliza tu menú',
        },
        {
          body: 'Imprime un código permanente para que cada mesa llegue a la versión vigente de tu carta.',
          title: 'Comparte un QR único',
        },
        {
          body: 'Cambia disponibilidad al instante y revisa cuándo tus clientes consultan el menú.',
          title: 'Actualiza y entiende',
        },
      ],
      kicker: 'Todo en su sitio',
      title: 'Una carta que sigue el ritmo de tu restaurante.',
    },
    footer: {
      brand: 'Sirio Automatiza · Cartas QR',
      tagline: 'Actualiza una vez. Llega a todas las mesas.',
    },
    hero: {
      kicker: 'Carta digital para restaurantes',
      lede: 'Convierte tu menú en una experiencia clara para cada mesa. Tus clientes escanean, consultan la carta vigente y tú conservas el control desde un solo lugar.',
      note: 'Un QR permanente · Sin apps ni descargas para tus clientes',
      primary: 'Ingresar a mi restaurante',
      secondary: 'Hablar con Sirio',
      titleEmphasis: 'mientras atiendes.',
      titleStart: 'Tu carta trabaja',
    },
    preview: { menu: 'Carta digital', scan: 'Escanea', section: 'Fondos' },
    questions: {
      items: [
        {
          answer:
            'No. El código se imprime una sola vez y apunta siempre a la misma dirección. Puedes cambiar platos, precios, fotos o el nombre visible sin volver a imprimir nada.',
          question: '¿El QR cambia si actualizo mi carta?',
        },
        {
          answer:
            'No. Escanean con la cámara de su teléfono y la carta se abre en el navegador, sin descargas ni registros.',
          question: '¿Mis clientes necesitan instalar algo?',
        },
        {
          answer:
            'Envías de una a cinco fotos de tus páginas y las convertimos en un borrador editable, con sus categorías, precios, variantes y adicionales. Después corriges lo que haga falta.',
          question: '¿Cómo cargo mi carta la primera vez?',
        },
        {
          answer:
            'Tú, desde tu celular. Cada cambio queda en borrador y solo llega a tus clientes cuando confirmas la publicación, así nunca ven una carta a medio editar.',
          question: '¿Quién actualiza la carta después?',
        },
        {
          answer:
            'Lo marcas como no disponible y desaparece de la carta al instante, conservando su descripción y su precio para cuando vuelva.',
          question: '¿Puedo ocultar un plato que se acabó?',
        },
      ],
      kicker: 'Antes de empezar',
      title: 'Lo que todos preguntan.',
    },
    signIn: 'Ingresar',
  },
};
