import type { Locale } from '../locale';

/** The owner's profile screen. The restaurant's own data is never part of this table. */
interface OwnerProfileCopy {
  address: { label: string; placeholder: string };
  contact: { body: string; title: string };
  emptyBody: string;
  kicker: string;
  lede: string;
  loadError: string;
  loading: string;
  logo: {
    alt: (restaurant: string) => string;
    change: string;
    hint: string;
    input: string;
    invalid: string;
    replace: string;
    upload: string;
  };
  managedByPlatform: string;
  openPublicMenu: string;
  phone: string;
  preview: string;
  progress: { hint: string; label: (completed: number, total: number) => string };
  save: string;
  saved: string;
  saving: string;
  social: {
    body: string;
    facebookPlaceholder: string;
    instagramPlaceholder: string;
    tiktokPlaceholder: string;
    title: string;
  };
  title: string;
}

export const ownerProfileCopy: Record<Locale, OwnerProfileCopy> = {
  en: {
    address: { label: 'Address', placeholder: '123 Main Ave, Miraflores' },
    contact: {
      body: 'Add the details your customers need to find you or get in touch.',
      title: 'How people find you',
    },
    emptyBody: 'Contact the administrator to review your account.',
    kicker: 'Restaurant panel',
    lede: 'Help people recognize your restaurant and know how to find you.',
    loadError: "We couldn't load your profile. Please try again.",
    loading: 'Loading profile',
    logo: {
      alt: (restaurant) => `${restaurant} logo`,
      change: 'Change selection',
      hint: 'PNG, JPG or WebP · 2 MB max',
      input: 'Restaurant logo',
      invalid: 'Your logo must be a PNG, JPG or WebP file of 2 MB or less.',
      replace: 'Replace logo',
      upload: 'Upload logo',
    },
    managedByPlatform: 'The platform manages your name and public address.',
    openPublicMenu: 'Open public menu',
    phone: 'Phone',
    preview: "How you'll look",
    progress: {
      hint: 'details that help your customers',
      label: (completed, total) => `${completed} of ${total} details completed`,
    },
    save: 'Save profile',
    saved: "Profile saved. Your restaurant's identity is up to date.",
    saving: 'Saving…',
    social: {
      body: 'Use full links that start with https://.',
      facebookPlaceholder: 'https://facebook.com/your-restaurant',
      instagramPlaceholder: 'https://instagram.com/your_restaurant',
      tiktokPlaceholder: 'https://tiktok.com/@your_restaurant',
      title: 'Where people follow you',
    },
    title: 'Your profile',
  },
  es: {
    address: { label: 'Dirección', placeholder: 'Av. Principal 123, Miraflores' },
    contact: {
      body: 'Agrega los datos que tus clientes necesitan para ubicarte o escribirte.',
      title: 'Cómo te encuentran',
    },
    emptyBody: 'Contacta al administrador para revisar tu cuenta.',
    kicker: 'Panel del restaurante',
    lede: 'Haz que las personas reconozcan tu restaurante y sepan cómo encontrarte.',
    loadError: 'No pudimos cargar el perfil. Vuelve a intentarlo.',
    loading: 'Cargando perfil',
    logo: {
      alt: (restaurant) => `Logo de ${restaurant}`,
      change: 'Cambiar selección',
      hint: 'PNG, JPG o WebP · máximo 2 MB',
      input: 'Logo del restaurante',
      invalid: 'El logo debe ser PNG, JPG o WebP y pesar como máximo 2 MB.',
      replace: 'Reemplazar logo',
      upload: 'Subir logo',
    },
    managedByPlatform: 'El nombre y la dirección pública los administra la plataforma.',
    openPublicMenu: 'Abrir carta pública',
    phone: 'Teléfono',
    preview: 'Así te verán',
    progress: {
      hint: 'datos que ayudan a tus clientes',
      label: (completed, total) => `${completed} de ${total} datos completados`,
    },
    save: 'Guardar perfil',
    saved: 'Perfil guardado. La identidad de tu restaurante está al día.',
    saving: 'Guardando…',
    social: {
      body: 'Usa enlaces completos que comiencen con https://.',
      facebookPlaceholder: 'https://facebook.com/tu-restaurante',
      instagramPlaceholder: 'https://instagram.com/tu_restaurante',
      tiktokPlaceholder: 'https://tiktok.com/@tu_restaurante',
      title: 'Dónde te siguen',
    },
    title: 'Tu perfil',
  },
};
