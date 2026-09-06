'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';

import { ActionSheet } from '@/components/action-sheet';
import { AppShell, PageTitle, SupportingCopy, Workspace, WorkspaceHeader } from '@/components/app-shell';
import { Button, InlineAction } from '@/components/button';
import { Field, FormError, fieldControl } from '@/components/field';
import { Card, ErrorBanner, Kicker, Notice, StatusPill } from '@/components/surfaces';
import type {
  PaginatedRestaurants,
  RestaurantStatus,
  RestaurantSummary,
} from '@/lib/restaurant-types';

import { BackofficeNavigation } from './backoffice-navigation';

const PAGE_STEP = 20;

const EMPTY_LIST: PaginatedRestaurants = {
  items: [],
  page: 1,
  pageSize: PAGE_STEP,
  total: 0,
};

interface ApiErrorBody {
  message?: string | string[];
}

export function RestaurantBackoffice() {
  const router = useRouter();
  const [data, setData] = useState(EMPTY_LIST);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<RestaurantStatus | ''>('');
  const [visible, setVisible] = useState(PAGE_STEP);
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState<RestaurantSummary | null>(null);
  const visibleCount = data.items.filter((restaurant) => restaurant.status === 'ENABLED').length;
  const pausedCount = data.items.length - visibleCount;
  const remaining = Math.max(data.total - data.items.length, 0);

  const loadRestaurants = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: '1', pageSize: String(visible) });
    if (query.trim()) params.set('query', query.trim());
    if (status) params.set('status', status);
    const response = await fetch(`/api/backoffice/restaurants?${params}`);
    if (response.status === 401 || response.status === 403) {
      router.replace('/login');
      return;
    }
    if (!response.ok) {
      setError('No pudimos cargar los restaurantes. Vuelve a intentarlo.');
      setLoading(false);
      return;
    }
    setData((await response.json()) as PaginatedRestaurants);
    setLoading(false);
  }, [query, router, status, visible]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadRestaurants(), 180);
    return () => window.clearTimeout(timeout);
  }, [loadRestaurants]);


  async function createRestaurant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch('/api/backoffice/restaurants', {
      body: JSON.stringify({
        email: form.get('email'),
        initialPassword: form.get('initialPassword'),
        name: form.get('name'),
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
    if (!response.ok) {
      setError(await readApiError(response, 'No pudimos crear el restaurante.'));
      return;
    }
    const created = (await response.json()) as RestaurantSummary;
    formElement.reset();
    setShowCreate(false);
    setNotice(`${created.name} fue dado de alta con la URL /${created.slug}.`);
    await loadRestaurants();
  }

  async function changeStatus(restaurant: RestaurantSummary) {
    const nextStatus: RestaurantStatus =
      restaurant.status === 'ENABLED' ? 'DISABLED' : 'ENABLED';
    const response = await fetch(
      `/api/backoffice/restaurants/${restaurant.id}/status`,
      {
        body: JSON.stringify({ status: nextStatus }),
        headers: { 'content-type': 'application/json' },
        method: 'PATCH',
      },
    );
    if (!response.ok) {
      setError('No pudimos cambiar el estado del restaurante.');
      return;
    }
    setNotice(
      nextStatus === 'ENABLED'
        ? `${restaurant.name} volvió a estar visible.`
        : `${restaurant.name} dejó de estar visible públicamente.`,
    );
    await loadRestaurants();
  }

  return (
    <AppShell navigation={<BackofficeNavigation active="restaurants" />}>
      <Workspace>
        <WorkspaceHeader
          actions={
            <Button className="max-md:w-full" onClick={() => setShowCreate((value) => !value)}>
              <span aria-hidden="true">＋</span>
              {showCreate ? 'Cerrar alta' : 'Nuevo restaurante'}
            </Button>
          }
        >
          <Kicker>Backoffice</Kicker>
          <PageTitle>Restaurantes</PageTitle>
          <SupportingCopy>
            Altas, visibilidad pública y bajas definitivas en un solo lugar.
          </SupportingCopy>
        </WorkspaceHeader>

        {showCreate ? <CreateRestaurantPanel onSubmit={createRestaurant} /> : null}
        {notice ? <Notice onDismiss={() => setNotice(null)}>{notice}</Notice> : null}
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}

        <Card aria-labelledby="registry-title" className="overflow-hidden">
          <div className="grid gap-5 border-b border-line p-5 sm:p-6 lg:grid-cols-[minmax(13.75rem,0.8fr)_minmax(0,1.2fr)] lg:items-end lg:gap-8">
            <div>
              <Kicker tone="copper">Registro operativo</Kicker>
              <h2
                className="my-1.5 font-display text-2xl font-semibold tracking-[-0.025em]"
                id="registry-title"
              >
                Registro de locales
              </h2>
              <p className="m-0 text-sm text-ink-muted tabular-nums">
                {data.total} {data.total === 1 ? 'restaurante' : 'restaurantes'} en esta búsqueda
              </p>
            </div>
            <div className="grid min-w-0 gap-3 lg:justify-items-end">
              <div
                aria-label="Resumen de esta vista"
                className="flex items-center gap-3 text-[10px] font-extrabold tracking-[0.06em] uppercase"
              >
                <span className="inline-flex items-center gap-1.5 text-olive">
                  <i aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                  {visibleCount} en servicio
                </span>
                <span className="inline-flex items-center gap-1.5 text-ink-muted">
                  <i aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                  {pausedCount} pausados
                </span>
              </div>
              <div className="grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_11rem] lg:w-auto">
                <label className="flex min-h-11 items-center gap-2 rounded-lg bg-control px-3">
                  <span className="sr-only">Buscar restaurante</span>
                  <span aria-hidden="true" className="text-ink-muted">
                    ⌕
                  </span>
                  <input
                    className="w-full border-0 bg-transparent text-base text-ink outline-0"
                    onChange={(event) => {
                      // Una búsqueda nueva empieza por el principio del listado.
                      setQuery(event.target.value);
                      setVisible(PAGE_STEP);
                    }}
                    placeholder="Buscar nombre, slug o correo"
                    type="search"
                    value={query}
                  />
                </label>
                <label>
                  <span className="sr-only">Filtrar por estado</span>
                  <select
                    className={fieldControl}
                    onChange={(event) => {
                      setStatus(event.target.value as RestaurantStatus | '');
                      setVisible(PAGE_STEP);
                    }}
                    value={status}
                  >
                    <option value="">Todos los estados</option>
                    <option value="ENABLED">Habilitados</option>
                    <option value="DISABLED">Deshabilitados</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          {loading && data.items.length === 0 ? (
            <div aria-label="Cargando restaurantes" className="grid" role="status">
              {[0, 1, 2].map((item) => (
                <span className="h-16 animate-pulse border-b border-line bg-ink/3" key={item} />
              ))}
            </div>
          ) : null}
          {!loading && data.items.length === 0 ? (
            <div className="grid min-h-80 content-center justify-items-center p-10 text-center">
              <span
                aria-hidden="true"
                className="grid size-14 -rotate-6 place-items-center rounded-full border border-line-strong font-display font-bold text-copper"
              >
                S/
              </span>
              <h3 className="mt-4 mb-1.5 font-display text-xl font-semibold tracking-tight">
                No hay restaurantes en esta vista
              </h3>
              <p className="m-0 text-sm text-ink-soft">
                Cambia los filtros o crea el primer registro.
              </p>
            </div>
          ) : null}
          {data.items.length > 0 ? (
            <div className="grid">
              {data.items.map((restaurant, index) => (
                <RestaurantRow
                  folio={index + 1}
                  key={restaurant.id}
                  onDelete={() => setDeleting(restaurant)}
                  onStatus={() => void changeStatus(restaurant)}
                  restaurant={restaurant}
                />
              ))}
            </div>
          ) : null}

          {remaining > 0 ? (
            <div className="border-t border-line p-4 text-center">
              <Button
                disabled={loading}
                onClick={() => setVisible((current) => current + PAGE_STEP)}
                tone="secondary"
              >
                {loading ? 'Cargando…' : `Cargar ${Math.min(remaining, PAGE_STEP)} más`}
              </Button>
              <p className="mt-2 mb-0 text-[11px] text-ink-muted tabular-nums">
                Mostrando {data.items.length} de {data.total}
              </p>
            </div>
          ) : null}
        </Card>
      </Workspace>

      <DeleteRestaurantDialog
        key={deleting?.id ?? 'closed'}
        onClose={() => setDeleting(null)}
        onDeleted={async (restaurant) => {
          setDeleting(null);
          setNotice(`${restaurant.name} fue eliminado definitivamente.`);
          await loadRestaurants();
        }}
        restaurant={deleting}
      />
    </AppShell>
  );
}

function CreateRestaurantPanel({
  onSubmit,
}: {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section
      aria-labelledby="create-title"
      className="mb-6 grid gap-6 rounded-xl border-l-4 border-l-copper bg-paper-raised p-6 shadow-soft sm:p-7 lg:grid-cols-[minmax(13.75rem,0.7fr)_minmax(0,1.7fr)] lg:gap-8"
    >
      <div>
        <Kicker tone="copper">Nueva alta</Kicker>
        <h2
          className="my-1.5 font-display text-2xl font-semibold tracking-[-0.025em]"
          id="create-title"
        >
          Abre la ficha del restaurante
        </h2>
        <p className="m-0 text-sm/normal text-ink-soft">
          El slug se asignará automáticamente y no cambiará después.
        </p>
      </div>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
        <Field className="sm:col-span-2" label="Nombre del restaurante">
          <input className={fieldControl} maxLength={160} minLength={2} name="name" required />
        </Field>
        <Field label="Correo del dueño">
          <input
            autoComplete="email"
            className={fieldControl}
            inputMode="email"
            maxLength={320}
            name="email"
            required
            type="email"
          />
        </Field>
        <Field hint="Mínimo 8 caracteres." label="Contraseña inicial">
          <input
            autoComplete="new-password"
            className={fieldControl}
            maxLength={128}
            minLength={8}
            name="initialPassword"
            required
            type="password"
          />
        </Field>
        <div className="sm:col-span-2 sm:justify-self-end">
          <Button className="max-sm:w-full" type="submit">
            Crear restaurante
          </Button>
        </div>
      </form>
    </section>
  );
}

/**
 * One restaurant per row.
 *
 * Collapsed it shows only what identifies the local: name, state and owner. The
 * slug, the date and the actions live behind the disclosure, which keeps a registry
 * of fifty locals readable instead of a 2,000px scroll. Permanent deletion sits in
 * its own menu, away from the day-to-day disable button.
 */
function RestaurantRow({
  folio,
  onDelete,
  onStatus,
  restaurant,
}: {
  folio: number;
  onDelete: () => void;
  onStatus: () => void;
  restaurant: RestaurantSummary;
}) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const enabled = restaurant.status === 'ENABLED';
  const initial = restaurant.name.trim().charAt(0).toLocaleUpperCase('es');

  return (
    <details
      className={`group relative border-b border-line last:border-b-0 ${enabled ? '' : 'bg-ink/2'}`}
      data-testid="restaurant-row"
    >
      <span
        aria-hidden="true"
        className={`absolute top-3 bottom-3 left-0 w-[3px] rounded-r ${enabled ? 'bg-olive' : 'bg-ink-muted'}`}
      />
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3 sm:px-7 [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-olive-wash font-display text-lg font-bold text-olive max-sm:hidden"
        >
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <strong className="text-[15px] font-extrabold">{restaurant.name}</strong>
            <StatusPill tone={enabled ? 'positive' : 'muted'}>
              {enabled ? 'Habilitado' : 'Deshabilitado'}
            </StatusPill>
          </span>
          <span className="mt-0.5 block truncate text-xs text-ink-muted">
            {restaurant.owner.email}
          </span>
        </span>
        <span
          aria-hidden="true"
          className="grid size-11 shrink-0 place-items-center text-lg text-ink-muted transition-transform duration-200 ease-soft group-open:rotate-180"
        >
          ⌄
        </span>
      </summary>

      <div className="grid gap-4 border-t border-line px-5 pt-4 pb-5 sm:px-7">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <dt className="text-[10px] font-bold tracking-[0.1em] text-ink-muted uppercase">
              Folio
            </dt>
            <dd className="m-0 text-[13px] font-semibold tabular-nums">
              {String(folio).padStart(3, '0')}
            </dd>
          </div>
          <div className="grid gap-1">
            <dt className="text-[10px] font-bold tracking-[0.1em] text-ink-muted uppercase">
              Alta
            </dt>
            <dd className="m-0 text-[13px] font-semibold tabular-nums">
              {new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(
                new Date(restaurant.createdAt),
              )}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <a
            className="inline-flex min-h-11 items-center gap-1.5 text-xs font-bold text-olive no-underline hover:underline"
            data-testid="public-menu-link"
            href={`/${restaurant.slug}`}
            rel="noreferrer"
            target="_blank"
          >
            Abrir carta <span aria-hidden="true">↗</span>
            <small className="font-mono text-[10px] font-semibold text-ink-muted">
              /{restaurant.slug}
            </small>
          </a>
          <Link
            className="inline-flex min-h-11 items-center gap-1.5 text-xs font-bold text-olive no-underline hover:underline"
            href={`/backoffice/statistics?restaurante=${encodeURIComponent(restaurant.id)}`}
          >
            Ver estadísticas <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button className="max-sm:flex-1" onClick={onStatus} tone="secondary">
            {enabled ? 'Deshabilitar' : 'Reactivar'}
          </Button>
          <InlineAction
            aria-label={`Acciones de ${restaurant.name}`}
            className="lg:hidden"
            onClick={() => setActionsOpen(true)}
          >
            Acciones ⌄
          </InlineAction>
          <ActionSheet
            label={`Acciones de ${restaurant.name}`}
            onClose={() => setActionsOpen(false)}
            open={actionsOpen}
          >
            <InlineAction
              aria-label={`Eliminar ${restaurant.name}`}
              danger
              onClick={() => {
                setActionsOpen(false);
                onDelete();
              }}
            >
              Eliminar definitivamente
            </InlineAction>
          </ActionSheet>
        </div>
      </div>
    </details>
  );
}

function DeleteRestaurantDialog({
  onClose,
  onDeleted,
  restaurant,
}: {
  onClose: () => void;
  onDeleted: (restaurant: RestaurantSummary) => Promise<void>;
  restaurant: RestaurantSummary | null;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [confirmation, setConfirmation] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expected = restaurant ? `ELIMINAR ${restaurant.slug}` : '';

  useEffect(() => {
    const dialog = dialogRef.current;
    if (restaurant && dialog && !dialog.open) dialog.showModal();
    if (!restaurant && dialog?.open) dialog.close();
  }, [restaurant]);

  if (!restaurant) return null;

  async function submitDeletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!restaurant) return;
    const response = await fetch(`/api/backoffice/restaurants/${restaurant.id}`, {
      body: JSON.stringify({
        acknowledgePermanentDeletion: acknowledged,
        confirmationText: confirmation,
      }),
      headers: { 'content-type': 'application/json' },
      method: 'DELETE',
    });
    if (!response.ok) {
      setError(await readApiError(response, 'No pudimos eliminar el restaurante.'));
      return;
    }
    dialogRef.current?.close();
    await onDeleted(restaurant);
  }

  return (
    <dialog
      className="w-[min(calc(100%-2rem),32.5rem)] rounded-2xl bg-paper-raised p-0 shadow-raised backdrop:bg-ink/55 backdrop:backdrop-blur-[3px]"
      onClose={onClose}
      ref={dialogRef}
    >
      <form className="grid gap-4 p-6 sm:p-8" onSubmit={submitDeletion}>
        <span
          aria-hidden="true"
          className="grid size-12 place-items-center rounded-full bg-danger-wash font-display text-2xl font-extrabold text-danger"
        >
          !
        </span>
        <Kicker tone="danger">Acción irreversible</Kicker>
        <h2 className="-mt-3 mb-0 font-display text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
          Eliminar {restaurant.name}
        </h2>
        <p className="m-0 text-sm/normal text-ink-soft">
          Se borrarán el restaurante, su cuenta sin otros locales, estadísticas y archivos
          asociados.
        </p>
        <label className="grid gap-2">
          <span className="text-[13px] font-bold text-ink-soft">
            Escribe <strong>{expected}</strong>
          </span>
          <input
            className={fieldControl}
            onChange={(event) => setConfirmation(event.target.value)}
            value={confirmation}
          />
        </label>
        <label className="flex cursor-pointer items-start gap-2.5 text-[13px]/normal text-ink-soft">
          <input
            checked={acknowledged}
            className="mt-0.5 size-5 accent-danger"
            onChange={(event) => setAcknowledged(event.target.checked)}
            type="checkbox"
          />
          <span>Entiendo que esta eliminación no se puede deshacer.</span>
        </label>
        {error ? <FormError>{error}</FormError> : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={() => dialogRef.current?.close()} tone="secondary">
            Cancelar
          </Button>
          <Button disabled={!acknowledged || confirmation !== expected} tone="danger" type="submit">
            Eliminar definitivamente
          </Button>
        </div>
      </form>
    </dialog>
  );
}

async function readApiError(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
  if (Array.isArray(body.message)) return body.message.join(' ');
  return body.message ?? fallback;
}
