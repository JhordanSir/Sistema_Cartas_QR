import type { Locale } from '../locale';

/** What every owner screen shares: its navigation and the account without a restaurant. */
interface OwnerPanelCopy {
  navigation: {
    help: string;
    label: string;
    menu: string;
    profile: string;
    qr: string;
    statistics: string;
  };
  noRestaurant: string;
}

export const ownerPanelCopy: Record<Locale, OwnerPanelCopy> = {
  en: {
    navigation: {
      help: 'Help',
      label: 'Restaurant panel',
      menu: 'Menu',
      profile: 'Profile',
      qr: 'QR',
      statistics: 'Statistics',
    },
    noRestaurant: "We couldn't find a restaurant linked to your account",
  },
  es: {
    navigation: {
      help: 'Ayuda',
      label: 'Panel del restaurante',
      menu: 'Carta',
      profile: 'Perfil',
      qr: 'QR',
      statistics: 'Estadísticas',
    },
    noRestaurant: 'No encontramos un restaurante asociado',
  },
};
