// The backoffice (§E12): what the server, the API and the page share.

export const BACKOFFICE_PAGE_SIZE = 20;
const SEARCH_MAX_LENGTH = 160;

export type RestaurantStatus = 'ENABLED' | 'DISABLED';

export type BackofficeRestaurant = {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string;
  status: RestaurantStatus;
  /** ISO 8601. */
  createdAt: string;
};

export type BackofficeList = {
  restaurants: BackofficeRestaurant[];
  total: number;
  page: number;
  pageCount: number;
};

export const PAUSED_RESTAURANT_NOTICE = 'Tu carta está pausada por el administrador. Los clientes no pueden verla.';
export const DELETE_UNDERSTOOD_LABEL = 'Entiendo que se borrará para siempre';

/** What the administrator must type, exactly, to delete a restaurant. */
export function deletePhrase(slug: string): string {
  return `ELIMINAR ${slug}`;
}

type SearchParam = string | string[] | null | undefined;

function first(value: SearchParam): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

/** `?q=…&page=…` of /admin and of its API: spaces unified, and page 1 for anything that is not a page. */
export function parseBackofficeQuery(params: { page?: SearchParam; q?: SearchParam }): {
  page: number;
  query: string;
} {
  const query = first(params.q).replace(/\s+/g, ' ').trim().slice(0, SEARCH_MAX_LENGTH);
  const page = Number.parseInt(first(params.page), 10);
  return { page: Number.isInteger(page) && page >= 1 ? page : 1, query };
}

/** The address of a page of the list, keeping the search. */
export function backofficeHref(query: string, page: number): string {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (page > 1) params.set('page', String(page));
  const search = params.toString();
  return search ? `/admin?${search}` : '/admin';
}
