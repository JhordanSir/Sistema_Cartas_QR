'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';

import { AppShell, PageTitle, SupportingCopy, Workspace, WorkspaceHeader } from '@/components/app-shell';
import { Button } from '@/components/button';
import { Field, FormError, fieldControl } from '@/components/field';
import { Card, ErrorBanner, Kicker, Notice, StatusPill } from '@/components/surfaces';
import type {
  PaginatedRestaurants,
  RestaurantStatus,
  RestaurantSummary,
} from '@/lib/restaurant-types';

import { BackofficeNavigation } from './backoffice-navigation';

const EMPTY_LIST: PaginatedRestaurants = {
  items: [],
  page: 1,
  pageSize: 20,
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
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState<RestaurantSummary | null>(null);
  const visibleCount = data.items.filter((restaurant) => restaurant.status === 'ENABLED').length;
  const pausedCount = data.items.length - visibleCount;

  const loadRestaurants = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: '1', pageSize: '100' });
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
  }, [query, router, status]);

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
              <h2 className="my-1.5 font-display text-2xl font-semibold tracking-[-0.025em]" id="registry-title">
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
                <label className="flex min-h-11 items-center gap-2 rounded-lg bg-control px-3 hover:border-line-strong">
                  <span className="sr-only">Buscar restaurante</span>
                  <span aria-hidden="true" className="text-ink-muted">
                    ⌕
                  </span>
                  <input
                    className="w-full border-0 bg-transparent text-base text-ink outline-0"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar nombre, slug o correo"
                    type="search"
                    value={query}
                  />
                </label>
                <label>
                  <span className="sr-only">Filtrar por estado</span>
                  <select
                    className={fieldControl}
                    onChange={(event) => setStatus(event.target.value as RestaurantStatus | '')}
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

          {loading ? (
            <div aria-label="Cargando restaurantes" className="grid" role="status">
              {[0, 1, 2].map((item) => (
                <span
                  className="h-26 animate-pulse border-b border-line bg-ink/3"
                  key={item}
                />
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
              <p className="m-0 text-sm text-ink-soft">Cambia los filtros o crea el primer registro.</p>
            </div>
          ) : null}
          {!loading && data.items.length > 0 ? (
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
        <h2 className="my-1.5 font-display text-2xl font-semibold tracking-[-0.025em]" id="create-title">
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
  const enabled = restaurant.status === 'ENABLED';
  const initial = restaurant.name.trim().charAt(0).toLocaleUpperCase('es');
  return (
    <article
      className={`relative grid gap-4 border-b border-line px-5 py-5 last:border-b-0 sm:px-7 lg:grid-cols-[minmax(16rem,1.6fr)_minmax(11rem,1fr)_9rem_auto] lg:items-center lg:gap-6 ${
        enabled ? '' : 'bg-ink/2'
      }`}
      data-testid="restaurant-row"
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-4 left-0 w-[3px] rounded-r ${enabled ? 'bg-olive' : 'bg-ink-muted'}`}
      />
      <div className="flex min-w-0 items-center gap-3.5">
        <span
          aria-hidden="true"
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-olive-wash font-display text-xl font-bold text-olive max-sm:hidden"
        >
          {initial}
        </span>
        <div className="min-w-0">
          <span className="mb-1 block text-[9px] font-black tracking-[0.12em] text-copper uppercase">
            Folio {String(folio).padStart(3, '0')}
          </span>
          <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-2.5">
            <h3 className="m-0 overflow-hidden text-[15px] font-extrabold text-ellipsis whitespace-nowrap">
              {restaurant.name}
            </h3>
            <StatusPill tone={enabled ? 'positive' : 'muted'}>
              {enabled ? 'Habilitado' : 'Deshabilitado'}
            </StatusPill>
          </div>
          <a
            className="mt-1.5 inline-flex min-h-11 items-center text-xs font-bold text-olive no-underline hover:underline"
            data-testid="public-menu-link"
            href={`/${restaurant.slug}`}
            rel="noreferrer"
            target="_blank"
          >
            Abrir carta <span aria-hidden="true">↗</span>{' '}
            <small className="ml-1 font-mono text-[10px] font-semibold text-ink-muted">
              /{restaurant.slug}
            </small>
          </a>
        </div>
      </div>

      <div className="grid min-w-0 gap-1">
        <span className="text-[10px] font-bold tracking-[0.1em] text-ink-muted uppercase">
          Propietario
        </span>
        <strong className="overflow-hidden text-[13px] font-semibold text-ellipsis whitespace-nowrap">
          {restaurant.owner.email}
        </strong>
      </div>

      <div className="grid min-w-0 gap-1">
        <span className="text-[10px] font-bold tracking-[0.1em] text-ink-muted uppercase">Alta</span>
        <strong className="text-[13px] font-semibold tabular-nums">
          {new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(
            new Date(restaurant.createdAt),
          )}
        </strong>
      </div>

      <div className="flex items-center gap-2 lg:justify-end">
        <Button className="max-sm:flex-1" onClick={onStatus} tone="secondary">
          {enabled ? 'Deshabilitar' : 'Reactivar'}
        </Button>
        <button
          aria-label={`Eliminar ${restaurant.name}`}
          className="grid size-11 shrink-0 place-items-center rounded-lg text-2xl text-danger transition-colors hover:bg-danger-wash active:scale-95"
          onClick={onDelete}
          type="button"
        >
          ×
        </button>
      </div>
    </article>
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
          <Button
            disabled={!acknowledged || confirmation !== expected}
            tone="danger"
            type="submit"
          >
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
