import type { Locale } from '../locale';

/** The frame of the help screen; the guides themselves live in app/admin/help/tutorials.ts. */
interface OwnerHelpCopy {
  badge: string;
  kicker: string;
  lede: string;
  /** The support sentence wraps the WhatsApp link, which the component places between both halves. */
  support: { after: string; before: string };
  title: string;
}

export const ownerHelpCopy: Record<Locale, OwnerHelpCopy> = {
  en: {
    badge: '5 guides · 1-minute read',
    kicker: 'Quick guides',
    lede: 'Five short guides to complete, publish and share your menu without leaving the panel.',
    support: {
      after: "and we'll sort it out with you.",
      before: "Something doesn't match what you see on screen? Message us on WhatsApp at",
    },
    title: 'Learn to run your menu from your phone.',
  },
  es: {
    badge: '5 pasos · lectura de 1 minuto',
    kicker: 'Guías rápidas',
    lede: 'Cinco guías breves para completar, publicar y compartir tu carta sin salir del panel.',
    support: {
      after: 'y lo resolvemos contigo.',
      before: '¿Algo no encaja con lo que ves en pantalla? Escríbenos por WhatsApp al',
    },
    title: 'Aprende a manejar tu carta desde el celular.',
  },
};
