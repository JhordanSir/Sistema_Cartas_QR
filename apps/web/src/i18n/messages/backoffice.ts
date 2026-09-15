import type { RestaurantStatus } from '@/lib/restaurant-types';

import { formatCount } from '../format';
import type { Locale } from '../locale';

/**
 * The administrator's restaurant registry. Restaurant names, slugs and owner emails are
 * content and only appear as parameters. The deletion phrase itself comes from
 * @sirio/shared so the API and the screen always ask for the same words.
 */
interface BackofficeCopy {
  create: {
    body: string;
    email: string;
    kicker: string;
    name: string;
    password: string;
    passwordHint: string;
    submit: string;
    title: string;
  };
  deletion: {
    acknowledge: string;
    body: string;
    cancel: string;
    kicker: string;
    submit: string;
    title: (restaurant: string) => string;
    /** Precedes the phrase to type, which the dialog shows in bold. */
    type: string;
  };
  header: { close: string; kicker: string; lede: string; open: string; title: string };
  navigation: { label: string; restaurants: string; statistics: string };
  notices: {
    created: (restaurant: string, slug: string) => string;
    deleted: (restaurant: string) => string;
    disabled: (restaurant: string) => string;
    enabled: (restaurant: string) => string;
    loadError: string;
    statusError: string;
  };
  registry: {
    empty: { body: string; title: string };
    filter: string;
    inService: (count: number) => string;
    kicker: string;
    loadMore: (count: number) => string;
    loading: string;
    loadingMore: string;
    paused: (count: number) => string;
    search: string;
    searchPlaceholder: string;
    showing: (shown: number, total: number) => string;
    statuses: Record<'' | RestaurantStatus, string>;
    summary: string;
    title: string;
    total: (count: number) => string;
  };
  row: {
    actions: string;
    actionsFor: (restaurant: string) => string;
    created: string;
    deleteFor: (restaurant: string) => string;
    deletePermanently: string;
    disable: string;
    folio: string;
    openMenu: string;
    reactivate: string;
    status: Record<RestaurantStatus, string>;
    statistics: string;
  };
}

export const backofficeCopy: Record<Locale, BackofficeCopy> = {
  en: {
    create: {
      body: 'The slug is assigned automatically and never changes afterwards.',
      email: "Owner's email",
      kicker: 'New restaurant',
      name: 'Restaurant name',
      password: 'Initial password',
      passwordHint: 'At least 8 characters, with an uppercase letter, a lowercase letter and a number.',
      submit: 'Create restaurant',
      title: "Open the restaurant's record",
    },
    deletion: {
      acknowledge: 'I understand this deletion cannot be undone.',
      body: 'This deletes the restaurant, its owner account if it has no other restaurants, its statistics and its files.',
      cancel: 'Cancel',
      kicker: 'Irreversible action',
      submit: 'Delete permanently',
      title: (restaurant) => `Delete ${restaurant}`,
      type: 'Type',
    },
    header: {
      close: 'Close form',
      kicker: 'Back office',
      lede: 'Onboarding, public visibility and permanent removal in one place.',
      open: 'New restaurant',
      title: 'Restaurants',
    },
    navigation: { label: 'Back office', restaurants: 'Restaurants', statistics: 'Statistics' },
    notices: {
      created: (restaurant, slug) => `${restaurant} is set up at /${slug}.`,
      deleted: (restaurant) => `${restaurant} was permanently deleted.`,
      disabled: (restaurant) => `${restaurant} is no longer publicly visible.`,
      enabled: (restaurant) => `${restaurant} is visible again.`,
      loadError: "We couldn't load the restaurants. Please try again.",
      statusError: "We couldn't change the restaurant's status.",
    },
    registry: {
      empty: {
        body: 'Change the filters or create the first entry.',
        title: 'No restaurants in this view',
      },
      filter: 'Filter by status',
      inService: (count) => `${count} in service`,
      kicker: 'Operations log',
      loadMore: (count) => `Load ${count} more`,
      loading: 'Loading restaurants',
      loadingMore: 'Loading…',
      paused: (count) => `${count} paused`,
      search: 'Search restaurants',
      searchPlaceholder: 'Search by name, slug or email',
      showing: (shown, total) => `Showing ${shown} of ${total}`,
      statuses: { '': 'All statuses', DISABLED: 'Disabled', ENABLED: 'Enabled' },
      summary: 'Summary of this view',
      title: 'Restaurant registry',
      total: (count) =>
        `${formatCount(count, 'en', { one: 'restaurant', other: 'restaurants' })} in this search`,
    },
    row: {
      actions: 'Actions ⌄',
      actionsFor: (restaurant) => `Actions for ${restaurant}`,
      created: 'Created',
      deleteFor: (restaurant) => `Delete ${restaurant}`,
      deletePermanently: 'Delete permanently',
      disable: 'Disable',
      folio: 'Entry',
      openMenu: 'Open menu',
      reactivate: 'Re-enable',
      statistics: 'View statistics',
      status: { DISABLED: 'Disabled', ENABLED: 'Enabled' },
    },
  },
  es: {
    create: {
      body: 'El slug se asignará automáticamente y no cambiará después.',
      email: 'Correo del dueño',
      kicker: 'Nueva alta',
      name: 'Nombre del restaurante',
      password: 'Contraseña inicial',
      passwordHint: 'Mínimo 8 caracteres, con mayúscula, minúscula y número.',
      submit: 'Crear restaurante',
      title: 'Abre la ficha del restaurante',
    },
    deletion: {
      acknowledge: 'Entiendo que esta eliminación no se puede deshacer.',
      body: 'Se borrarán el restaurante, su cuenta sin otros locales, estadísticas y archivos asociados.',
      cancel: 'Cancelar',
      kicker: 'Acción irreversible',
      submit: 'Eliminar definitivamente',
      title: (restaurant) => `Eliminar ${restaurant}`,
      type: 'Escribe',
    },
    header: {
      close: 'Cerrar alta',
      kicker: 'Backoffice',
      lede: 'Altas, visibilidad pública y bajas definitivas en un solo lugar.',
      open: 'Nuevo restaurante',
      title: 'Restaurantes',
    },
    navigation: { label: 'Backoffice', restaurants: 'Restaurantes', statistics: 'Estadísticas' },
    notices: {
      created: (restaurant, slug) => `${restaurant} fue dado de alta con la URL /${slug}.`,
      deleted: (restaurant) => `${restaurant} fue eliminado definitivamente.`,
      disabled: (restaurant) => `${restaurant} dejó de estar visible públicamente.`,
      enabled: (restaurant) => `${restaurant} volvió a estar visible.`,
      loadError: 'No pudimos cargar los restaurantes. Vuelve a intentarlo.',
      statusError: 'No pudimos cambiar el estado del restaurante.',
    },
    registry: {
      empty: {
        body: 'Cambia los filtros o crea el primer registro.',
        title: 'No hay restaurantes en esta vista',
      },
      filter: 'Filtrar por estado',
      inService: (count) => `${count} en servicio`,
      kicker: 'Registro operativo',
      loadMore: (count) => `Cargar ${count} más`,
      loading: 'Cargando restaurantes',
      loadingMore: 'Cargando…',
      paused: (count) => `${count} pausados`,
      search: 'Buscar restaurante',
      searchPlaceholder: 'Buscar nombre, slug o correo',
      showing: (shown, total) => `Mostrando ${shown} de ${total}`,
      statuses: { '': 'Todos los estados', DISABLED: 'Deshabilitados', ENABLED: 'Habilitados' },
      summary: 'Resumen de esta vista',
      title: 'Registro de locales',
      total: (count) => `${count} ${count === 1 ? 'restaurante' : 'restaurantes'} en esta búsqueda`,
    },
    row: {
      actions: 'Acciones ⌄',
      actionsFor: (restaurant) => `Acciones de ${restaurant}`,
      created: 'Alta',
      deleteFor: (restaurant) => `Eliminar ${restaurant}`,
      deletePermanently: 'Eliminar definitivamente',
      disable: 'Deshabilitar',
      folio: 'Folio',
      openMenu: 'Abrir carta',
      reactivate: 'Reactivar',
      statistics: 'Ver estadísticas',
      status: { DISABLED: 'Deshabilitado', ENABLED: 'Habilitado' },
    },
  },
};
