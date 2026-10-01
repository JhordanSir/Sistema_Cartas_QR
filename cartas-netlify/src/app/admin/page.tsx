import type { Metadata } from 'next';

import { Button, ButtonLink } from '@/components/ui/button';
import { controlClasses, Field } from '@/components/ui/field';
import { listRestaurants } from '@/server/backoffice';
import { requireAdminPage } from '@/server/next/page-auth';
import { backofficeHref, parseBackofficeQuery } from '@/shared/backoffice';

import { RestaurantList } from './restaurant-list';

export const metadata: Metadata = { title: 'Backoffice' };

const dateFormat = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeZone: 'America/Lima' });

function summary(total: number, query: string): string {
  if (total === 0) return query ? `Ningún restaurante coincide con «${query}».` : 'Aún no hay restaurantes registrados.';
  const count = `${total} ${total === 1 ? 'restaurante' : 'restaurantes'}`;
  return query ? `${count} para «${query}».` : `${count}.`;
}

/** The registered restaurants, 20 per page, searchable by name, slug or email (§E12). */
export default async function BackofficePage(props: PageProps<'/admin'>) {
  await requireAdminPage();
  const { page, query } = parseBackofficeQuery(await props.searchParams);
  const list = await listRestaurants({ page, query });
  // Dates are formatted here, in Lima time, so the browser's own zone never changes them.
  const restaurants = list.restaurants.map((restaurant) => ({
    ...restaurant,
    createdLabel: dateFormat.format(new Date(restaurant.createdAt)),
  }));

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="m-0 font-display text-3xl font-semibold tracking-tight">Backoffice</h1>
        <p className="m-0 max-w-prose text-[15px] text-ink-soft">
          Los restaurantes registrados: pausa su carta, dale a su dueño una contraseña temporal o elimínalos.
        </p>
      </div>

      <form action="/admin" className="flex flex-wrap items-end gap-3" method="get" role="search">
        <Field className="min-w-0 flex-1 basis-64" id="buscar" label="Buscar por nombre, slug o correo">
          {(control) => (
            <input {...control} className={controlClasses} defaultValue={query} name="q" type="search" />
          )}
        </Field>
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      <p className="m-0 text-sm text-ink-soft" role="status">
        {summary(list.total, query)}
      </p>

      {restaurants.length > 0 ? <RestaurantList restaurants={restaurants} /> : null}

      {list.pageCount > 1 ? (
        <nav aria-label="Páginas" className="flex flex-wrap items-center justify-between gap-3">
          {list.page > 1 ? (
            <ButtonLink href={backofficeHref(query, list.page - 1)} variant="secondary">
              Anterior
            </ButtonLink>
          ) : (
            <span />
          )}
          <span className="text-sm text-ink-soft">
            Página {list.page} de {list.pageCount}
          </span>
          {list.page < list.pageCount ? (
            <ButtonLink href={backofficeHref(query, list.page + 1)} variant="secondary">
              Siguiente
            </ButtonLink>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
