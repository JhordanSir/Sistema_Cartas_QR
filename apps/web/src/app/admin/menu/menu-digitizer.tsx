'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

import type { PublishedMenu, RestaurantProfile } from '@/lib/restaurant-types';

import { OwnerNavigation } from '../owner-navigation';
import { MenuManager } from './menu-manager';
import { MenuPublicationControls } from './menu-publication-controls';

const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const MAX_TOTAL_BYTES = 12 * 1024 * 1024;
const ACCEPTED_PHOTOS = ['image/jpeg', 'image/png', 'image/webp'];
const PROCESSING_STAGES = [
  'Leyendo las páginas de tu carta…',
  'Reconociendo categorías, platos y precios…',
  'Interpretando variantes y adicionales…',
  'Preparando el borrador para tu revisión…',
];

export function MenuDigitizer() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<RestaurantProfile[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [menu, setMenu] = useState<PublishedMenu | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [digitizing, setDigitizing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [processingStage, setProcessingStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );
  const selected = useMemo(
    () => restaurants.find((restaurant) => restaurant.id === selectedId) ?? restaurants[0],
    [restaurants, selectedId],
  );

  const loadMenu = useCallback(async (restaurantId: string) => {
    const response = await fetch(`/api/owner/restaurants/${restaurantId}/menu`, {
      cache: 'no-store',
    });
    if (response.status === 401 || response.status === 403) {
      router.replace('/admin/login');
      return;
    }
    if (!response.ok) throw new Error('No pudimos cargar el borrador de la carta.');
    setMenu((await response.json()) as PublishedMenu);
  }, [router]);

  const loadRestaurants = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await fetch('/api/owner/restaurants', { cache: 'no-store' });
    if (response.status === 401 || response.status === 403) {
      router.replace('/admin/login');
      return;
    }
    if (!response.ok) {
      setError('No pudimos cargar tus restaurantes. Vuelve a intentarlo.');
      setLoading(false);
      return;
    }
    const profiles = (await response.json()) as RestaurantProfile[];
    const firstId = profiles[0]?.id ?? '';
    setRestaurants(profiles);
    setSelectedId((current) => current || firstId);
    if (firstId) {
      try {
        await loadMenu(firstId);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'No pudimos cargar la carta.');
      }
    }
    setLoading(false);
  }, [loadMenu, router]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadRestaurants(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadRestaurants]);

  useEffect(() => () => {
    previews.forEach(({ url }) => URL.revokeObjectURL(url));
  }, [previews]);

  useEffect(() => {
    if (!digitizing) return;
    const interval = window.setInterval(
      () => setProcessingStage((current) => Math.min(current + 1, PROCESSING_STAGES.length - 1)),
      5_000,
    );
    return () => window.clearInterval(interval);
  }, [digitizing]);

  async function switchRestaurant(event: ChangeEvent<HTMLSelectElement>) {
    const restaurantId = event.target.value;
    setSelectedId(restaurantId);
    setFiles([]);
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      await loadMenu(restaurantId);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No pudimos cargar la carta.');
    }
    setLoading(false);
  }

  function selectPhotos(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    setError(null);
    setNotice(null);
    const totalBytes = selectedFiles.reduce((total, file) => total + file.size, 0);
    if (
      selectedFiles.length < 1 ||
      selectedFiles.length > MAX_PHOTOS ||
      selectedFiles.some((file) => !ACCEPTED_PHOTOS.includes(file.type) || file.size > MAX_PHOTO_BYTES) ||
      totalBytes > MAX_TOTAL_BYTES
    ) {
      event.target.value = '';
      setFiles([]);
      setError('Elige entre 1 y 5 fotos JPG, PNG o WebP; máximo 3 MB cada una y 12 MB en total.');
      return;
    }
    setFiles(selectedFiles);
  }

  async function digitize() {
    if (!selected || files.length === 0) return;
    setDigitizing(true);
    setProcessingStage(0);
    setError(null);
    setNotice(null);
    const body = new FormData();
    files.forEach((file) => body.append('photos', file));
    const response = await fetch(`/api/owner/restaurants/${selected.id}/menu/digitize`, {
      body,
      method: 'POST',
    });
    if (!response.ok) {
      setError(await readApiError(response));
      setDigitizing(false);
      return;
    }
    setMenu((await response.json()) as PublishedMenu);
    setFiles([]);
    setNotice('Carta digitalizada. Revísala y publícala cuando esté lista.');
    setDigitizing(false);
  }

  async function publishMenu() {
    if (!selected) return;
    setPublishing(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/owner/restaurants/${selected.id}/menu/publish`, { method: 'POST' });
      if (!response.ok) {
        setError(await readApiError(response));
        return;
      }
      setMenu((await response.json()) as PublishedMenu);
      setNotice('La carta pública se actualizó. El QR sigue siendo el mismo.');
    } finally {
      setPublishing(false);
    }
  }

  async function chooseTemplate(template: PublishedMenu['template']) {
    if (!selected) return;
    setTemplateSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/owner/restaurants/${selected.id}/menu/template`, {
        body: JSON.stringify({ template }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      });
      if (!response.ok) {
        setError(await readApiError(response));
        return;
      }
      setMenu((await response.json()) as PublishedMenu);
      setNotice('Plantilla aplicada al borrador. Publícala cuando estés conforme.');
    } finally {
      setTemplateSaving(false);
    }
  }

  return (
    <main className="backoffice-shell owner-admin-shell">
      <OwnerNavigation active="menu" />
      <section className="workspace owner-workspace menu-workspace">
        <header className="workspace-header owner-workspace-header">
          <div>
            <span className="kicker">Carta del restaurante</span>
            <h1>Prepara la próxima versión de tu carta.</h1>
            <p className="supporting-copy">
              Cada ajuste queda en borrador. Tú decides cuándo actualizar lo que ven tus clientes.
            </p>
          </div>
          {restaurants.length > 1 ? (
            <label className="restaurant-switcher">
              <span>Restaurante</span>
              <select onChange={switchRestaurant} value={selected?.id}>{restaurants.map((restaurant) => (
                <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>
              ))}</select>
            </label>
          ) : null}
        </header>

        {notice ? <div className="notice" role="status">{notice}</div> : null}
        {error ? <div className="error-banner" role="alert">{error}</div> : null}
        {loading ? <MenuSkeleton /> : null}
        {!loading && !selected ? (
          <section className="profile-empty"><h2>No encontramos un restaurante asociado</h2></section>
        ) : null}
        {!loading && selected ? (
          <>
            {menu ? (
              <MenuPublicationControls
                menu={menu}
                onPublish={publishMenu}
                onTemplate={chooseTemplate}
                publishing={publishing}
                restaurant={selected}
                templateSaving={templateSaving}
              />
            ) : null}
            <div className="digitizer-layout">
            <section className="digitizer-card">
              <div className="profile-section-heading">
                <span className="section-number">01</span>
                <div>
                  <h2>Sube las fotos de tu carta</h2>
                  <p>Usa buena luz y texto enfocado. Incluye cada página completa.</p>
                </div>
              </div>
              <label className="menu-photo-dropzone">
                <span className="upload-glyph" aria-hidden="true">↥</span>
                <strong>{files.length ? 'Cambiar fotografías' : 'Seleccionar fotografías'}</strong>
                <small>1–5 archivos · JPG, PNG o WebP · 3 MB por foto</small>
                <input
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="Fotos de la carta"
                  disabled={digitizing}
                  multiple
                  onChange={selectPhotos}
                  type="file"
                />
              </label>
              {previews.length > 0 ? (
                <div className="menu-photo-previews" aria-label="Fotografías seleccionadas">
                  {previews.map(({ file, url }, index) => (
                    <figure key={`${file.name}-${file.lastModified}`}>
                      {/* A local object URL is intentionally rendered with a native image. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img alt={`Página ${index + 1}: ${file.name}`} src={url} />
                      <figcaption><span>Página {index + 1}</span>{formatBytes(file.size)}</figcaption>
                    </figure>
                  ))}
                </div>
              ) : null}
              <button
                className="button button-primary digitize-button"
                disabled={digitizing || files.length === 0}
                onClick={digitize}
                type="button"
              >
                {digitizing ? 'Digitalizando…' : 'Digitalizar en borrador'}
              </button>
              <p className="privacy-note">Las fotos se envían a Gemini para interpretarlas y no se almacenan en Sirio.</p>
            </section>

            <section className="published-menu-card">
              <div className="profile-section-heading">
                <span className="section-number">02</span>
                <div>
                  <h2>Tu borrador de carta</h2>
                  <p>{menu?.categories.length ? 'Revisa el resultado antes de actualizar la carta pública.' : 'Aquí aparecerá tu carta después de digitalizarla.'}</p>
                </div>
              </div>
              <div className={`menu-public-status${menu?.publication.hasUnpublishedChanges ? ' menu-public-status-draft' : menu?.publication.hasPublishedMenu ? ' menu-public-status-live' : ''}`} role="status">
                <span aria-hidden="true">●</span>
                <p>{menu?.publication.hasUnpublishedChanges
                  ? 'Hay cambios en borrador. La carta pública conserva su versión anterior.'
                  : menu?.publication.hasPublishedMenu
                    ? 'Esta es la misma versión que está publicada ahora.'
                    : 'Aún no hay una carta publicada. Tu QR mostrará Próximamente.'}</p>
              </div>
              {digitizing ? <ProcessingState stage={processingStage} /> : null}
              {!digitizing && menu ? (
                <>
                  <div className="public-menu-shortcut">
                    <Link href={`/${selected.slug}`} rel="noreferrer" target="_blank">{menu.publication.hasPublishedMenu ? 'Ver carta publicada ↗' : 'Ver enlace del QR ↗'}</Link>
                  </div>
                  <MenuManager
                    menu={menu}
                    restaurant={selected}
                    setError={setError}
                    setMenu={setMenu}
                    setNotice={setNotice}
                  />
                </>
              ) : null}
            </section>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}

function ProcessingState({ stage }: { stage: number }) {
  return (
    <div className="menu-processing" aria-live="polite" role="status">
      <span className="processing-orbit" aria-hidden="true"><i /><i /><i /></span>
      <h3>Gemini está interpretando tu carta</h3>
      <p>{PROCESSING_STAGES[stage]}</p>
      <div>{PROCESSING_STAGES.map((_, index) => <span className={index <= stage ? 'complete' : ''} key={index} />)}</div>
      <small>No cierres esta ventana. Podrás revisar el borrador al terminar.</small>
    </div>
  );
}

function MenuSkeleton() {
  return <div className="profile-skeleton menu-skeleton" aria-label="Cargando carta" role="status"><span /><span /></div>;
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { message?: string | string[] };
  if (Array.isArray(body.message)) return body.message.join(' ');
  return body.message ?? 'No pudimos completar la operación. Vuelve a intentarlo.';
}
