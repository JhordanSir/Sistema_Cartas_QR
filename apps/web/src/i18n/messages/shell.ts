import type { Locale } from '../locale';

type ThemeName = 'dark' | 'light' | 'system';

/** Copy for the frame every surface shares: layout, brand, shell controls, 404. */
interface ShellCopy {
  brandHome: string;
  checkingSession: string;
  close: string;
  dismissNotice: string;
  language: string;
  metadata: { description: string; title: string };
  notFound: { back: string; body: string; title: string };
  password: { hide: string; label: string; show: string };
  restaurant: string;
  signOut: string;
  theme: {
    change: (name: string) => string;
    current: (name: string) => string;
    names: Record<ThemeName, string>;
  };
}

export const shellCopy: Record<Locale, ShellCopy> = {
  en: {
    brandHome: 'Sirio Automatiza, home',
    checkingSession: 'Checking your session…',
    close: 'Close',
    dismissNotice: 'Dismiss notice',
    language: 'Language',
    metadata: {
      description: 'Digital menus for restaurants, always up to date.',
      title: 'Sirio Automatiza | QR Menus',
    },
    notFound: {
      back: 'Back to home',
      body: 'The restaurant may be temporarily disabled, or this address no longer exists.',
      title: "This menu isn't available.",
    },
    password: { hide: 'Hide', label: 'Password', show: 'Show' },
    restaurant: 'Restaurant',
    signOut: 'Sign out',
    theme: {
      change: (name) => `Theme: ${name}. Change theme`,
      current: (name) => `Theme: ${name}`,
      names: { dark: 'dark', light: 'light', system: 'automatic' },
    },
  },
  es: {
    brandHome: 'Sirio Automatiza, inicio',
    checkingSession: 'Comprobando tu sesión…',
    close: 'Cerrar',
    dismissNotice: 'Cerrar aviso',
    language: 'Idioma',
    metadata: {
      description: 'Cartas digitales para restaurantes, siempre actualizadas.',
      title: 'Sirio Automatiza | Cartas QR',
    },
    notFound: {
      back: 'Volver al inicio',
      body: 'El restaurante puede estar temporalmente deshabilitado o la dirección ya no existe.',
      title: 'Esta carta no está disponible.',
    },
    password: { hide: 'Ocultar', label: 'Contraseña', show: 'Mostrar' },
    restaurant: 'Restaurante',
    signOut: 'Cerrar sesión',
    theme: {
      change: (name) => `Tema: ${name}. Cambiar tema`,
      current: (name) => `Tema: ${name}`,
      names: { dark: 'oscuro', light: 'claro', system: 'automático' },
    },
  },
};
