'use client';

import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';

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
    <main className="backoffice-shell">
      <BackofficeNavigation active="restaurants" />

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <span className="kicker">Backoffice</span>
            <h1>Restaurantes</h1>
            <p className="supporting-copy">
              Altas, visibilidad pública y bajas definitivas en un solo lugar.
            </p>
          </div>
          <button
            className="button button-primary"
            onClick={() => setShowCreate((value) => !value)}
            type="button"
          >
            <span aria-hidden="true">＋</span>
            {showCreate ? 'Cerrar alta' : 'Nuevo restaurante'}
          </button>
        </header>

        {showCreate ? <CreateRestaurantPanel onSubmit={createRestaurant} /> : null}
        {notice ? (
          <div className="notice" role="status">
            <span>{notice}</span>
            <button aria-label="Cerrar aviso" onClick={() => setNotice(null)} type="button">×</button>
          </div>
        ) : null}
        {error ? <div className="error-banner" role="alert">{error}</div> : null}

        <section className="registry" aria-labelledby="registry-title">
          <div className="registry-toolbar">
            <div>
              <h2 id="registry-title">Registro de locales</h2>
              <p>{data.total} {data.total === 1 ? 'restaurante' : 'restaurantes'}</p>
            </div>
            <div className="filters">
              <label className="search-field">
                <span className="sr-only">Buscar restaurante</span>
                <span aria-hidden="true">⌕</span>
                <input
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar nombre, slug o correo"
                  type="search"
                  value={query}
                />
              </label>
              <label>
                <span className="sr-only">Filtrar por estado</span>
                <select
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

          {loading ? <RestaurantSkeleton /> : null}
          {!loading && data.items.length === 0 ? (
            <div className="empty-state">
              <span className="empty-stamp" aria-hidden="true">S/</span>
              <h3>No hay restaurantes en esta vista</h3>
              <p>Cambia los filtros o crea el primer registro.</p>
            </div>
          ) : null}
          {!loading && data.items.length > 0 ? (
            <div className="restaurant-list">
              {data.items.map((restaurant) => (
                <RestaurantRow
                  key={restaurant.id}
                  onDelete={() => setDeleting(restaurant)}
                  onStatus={() => void changeStatus(restaurant)}
                  restaurant={restaurant}
                />
              ))}
            </div>
          ) : null}
        </section>
      </section>

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
    </main>
  );
}

function CreateRestaurantPanel({
  onSubmit,
}: {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="create-panel" aria-labelledby="create-title">
      <div className="create-intro">
        <span className="ticket-number">Nueva alta</span>
        <h2 id="create-title">Abre la ficha del restaurante</h2>
        <p>El slug se asignará automáticamente y no cambiará después.</p>
      </div>
      <form className="create-form" onSubmit={onSubmit}>
        <label className="field field-wide">
          <span>Nombre del restaurante</span>
          <input maxLength={160} minLength={2} name="name" required />
        </label>
        <label className="field">
          <span>Correo del dueño</span>
          <input autoComplete="email" maxLength={320} name="email" required type="email" />
        </label>
        <label className="field">
          <span>Contraseña inicial</span>
          <input autoComplete="new-password" maxLength={128} minLength={8} name="initialPassword" required type="password" />
          <small>Mínimo 8 caracteres.</small>
        </label>
        <button className="button button-primary" type="submit">Crear restaurante</button>
      </form>
    </section>
  );
}

function RestaurantRow({
  onDelete,
  onStatus,
  restaurant,
}: {
  onDelete: () => void;
  onStatus: () => void;
  restaurant: RestaurantSummary;
}) {
  const enabled = restaurant.status === 'ENABLED';
  const initial = restaurant.name.trim().charAt(0).toLocaleUpperCase('es');
  return (
    <article className={`restaurant-row ${enabled ? '' : 'restaurant-row-muted'}`}>
      <div className="restaurant-identity">
        <span className="restaurant-monogram" aria-hidden="true">{initial}</span>
        <div>
          <div className="restaurant-title-line">
            <h3>{restaurant.name}</h3>
            <span className={`status-pill ${enabled ? 'status-enabled' : 'status-disabled'}`}>
              <span aria-hidden="true" />
              {enabled ? 'Habilitado' : 'Deshabilitado'}
            </span>
          </div>
          <a href={`/${restaurant.slug}`} target="_blank" rel="noreferrer">/{restaurant.slug}</a>
        </div>
      </div>
      <div className="owner-cell">
        <span>Propietario</span>
        <strong>{restaurant.owner.email}</strong>
      </div>
      <div className="date-cell">
        <span>Alta</span>
        <strong>{new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(restaurant.createdAt))}</strong>
      </div>
      <div className="row-actions">
        <button className="button button-secondary" onClick={onStatus} type="button">
          {enabled ? 'Deshabilitar' : 'Reactivar'}
        </button>
        <button className="icon-button danger-button" aria-label={`Eliminar ${restaurant.name}`} onClick={onDelete} type="button">×</button>
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
    <dialog className="delete-dialog" onClose={onClose} ref={dialogRef}>
      <form onSubmit={submitDeletion}>
        <span className="danger-seal" aria-hidden="true">!</span>
        <span className="kicker kicker-danger">Acción irreversible</span>
        <h2>Eliminar {restaurant.name}</h2>
        <p>
          Se borrarán el restaurante, su cuenta sin otros locales, estadísticas y archivos asociados.
        </p>
        <label className="field">
          <span>Escribe <strong>{expected}</strong></span>
          <input onChange={(event) => setConfirmation(event.target.value)} value={confirmation} />
        </label>
        <label className="check-field">
          <input checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} type="checkbox" />
          <span>Entiendo que esta eliminación no se puede deshacer.</span>
        </label>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="dialog-actions">
          <button className="button button-secondary" onClick={() => dialogRef.current?.close()} type="button">Cancelar</button>
          <button className="button button-danger" disabled={!acknowledged || confirmation !== expected} type="submit">Eliminar definitivamente</button>
        </div>
      </form>
    </dialog>
  );
}

function RestaurantSkeleton() {
  return (
    <div className="skeleton-list" aria-label="Cargando restaurantes" role="status">
      {[0, 1, 2].map((item) => <span key={item} />)}
    </div>
  );
}

async function readApiError(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
  if (Array.isArray(body.message)) return body.message.join(' ');
  return body.message ?? fallback;
}
