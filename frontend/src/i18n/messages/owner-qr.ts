import type { Locale } from '../locale';

/** The owner's QR screen. */
interface OwnerQrCopy {
  cardLabel: (restaurant: string) => string;
  copied: string;
  copy: string;
  copyError: string;
  disabled: string;
  download: { body: string; kicker: string; png: string; svg: string; title: string };
  imageAlt: (restaurant: string) => string;
  kicker: string;
  lede: string;
  linkError: string;
  loadError: string;
  loading: string;
  permanentLink: string;
  preparingLink: string;
  preparingPublicLink: string;
  readyToShare: string;
  scan: string;
  testPublicLink: string;
  tied: { body: string; title: string };
  title: string;
}

export const ownerQrCopy: Record<Locale, OwnerQrCopy> = {
  en: {
    cardLabel: (restaurant) => `Permanent QR code for ${restaurant}`,
    copied: 'Copied',
    copy: 'Copy link',
    copyError: "We couldn't copy the link. Select it manually.",
    disabled:
      'The QR code is still valid, but your public menu stays hidden until the administrator re-enables the restaurant.',
    download: {
      body: 'PNG works well for quick digital pieces. SVG stays perfectly sharp for print and large formats.',
      kicker: 'Ready to print',
      png: 'Download PNG',
      svg: 'Download SVG',
      title: 'Download it and share it',
    },
    imageAlt: (restaurant) => `QR code for ${restaurant}`,
    kicker: 'Share your menu',
    lede: 'Print it once. Your menu keeps updating behind the same code.',
    linkError: "We couldn't load the permanent link for your QR code.",
    loadError: "We couldn't load your restaurant's QR code.",
    loading: 'Loading QR code',
    permanentLink: 'Permanent link',
    preparingLink: 'Preparing link…',
    preparingPublicLink: 'Preparing public link…',
    readyToShare: 'Ready to share',
    scan: 'Scan to see the menu',
    testPublicLink: 'Try the public link ↗',
    tied: {
      body: 'You can change dishes, prices, availability or your display name without reprinting it.',
      title: 'This code is tied to your address, not to your content.',
    },
    title: 'Your QR code never changes',
  },
  es: {
    cardLabel: (restaurant) => `QR permanente de ${restaurant}`,
    copied: 'Copiado',
    copy: 'Copiar enlace',
    copyError: 'No pudimos copiar el enlace. Selecciónalo manualmente.',
    disabled:
      'El QR sigue siendo válido, pero la carta pública permanecerá oculta hasta que el administrador reactive el restaurante.',
    download: {
      body: 'PNG funciona bien para piezas rápidas. SVG conserva máxima nitidez en imprenta y gran formato.',
      kicker: 'Listo para imprimir',
      png: 'Descargar PNG',
      svg: 'Descargar SVG',
      title: 'Descárgalo y compártelo',
    },
    imageAlt: (restaurant) => `Código QR de ${restaurant}`,
    kicker: 'Comparte tu carta',
    lede: 'Imprímelo una vez. La carta seguirá actualizándose detrás del mismo código.',
    linkError: 'No pudimos cargar el enlace permanente del QR.',
    loadError: 'No pudimos cargar el QR de tu restaurante.',
    loading: 'Cargando QR',
    permanentLink: 'Enlace permanente',
    preparingLink: 'Preparando enlace…',
    preparingPublicLink: 'Preparando enlace público…',
    readyToShare: 'Listo para compartir',
    scan: 'Escanea para ver la carta',
    testPublicLink: 'Probar enlace público ↗',
    tied: {
      body: 'Puedes cambiar platos, precios, disponibilidad o nombre visible sin reimprimirlo.',
      title: 'Este código está ligado al slug, no al contenido.',
    },
    title: 'Tu QR no cambia',
  },
};
