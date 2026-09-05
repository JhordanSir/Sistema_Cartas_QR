'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { AppShell, PageTitle, SupportingCopy, Workspace, WorkspaceHeader } from '@/components/app-shell';
import { Button } from '@/components/button';
import { RestaurantSwitcher } from '@/components/restaurant-switcher';
import {
  Card,
  ErrorBanner,
  Kicker,
  Notice,
  NumberedHeading,
  Skeleton,
} from '@/components/surfaces';
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
    <AppShell navigation={<OwnerNavigation active="menu" />}>
      <Workspace className="max-w-[94rem]">
        <WorkspaceHeader
          actions={
            <RestaurantSwitcher
              onChange={(event) => void switchRestaurant(event)}
              restaurants={restaurants}
              selectedId={selected?.id}
            />
          }
        >
          <Kicker>Carta del restaurante</Kicker>
          <PageTitle>Prepara la próxima versión de tu carta.</PageTitle>
          <SupportingCopy>
            Cada ajuste queda en borrador. Tú decides cuándo actualizar lo que ven tus clientes.
          </SupportingCopy>
        </WorkspaceHeader>

        {notice ? <Notice onDismiss={() => setNotice(null)}>{notice}</Notice> : null}
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
        {loading ? (
          <div
            aria-label="Cargando carta"
            className="grid gap-6 xl:grid-cols-[minmax(18.75rem,0.82fr)_minmax(26rem,1.35fr)]"
            role="status"
          >
            <Skeleton className="min-h-96" />
            <Skeleton className="min-h-96" />
          </div>
        ) : null}
        {!loading && !selected ? (
          <Card className="grid min-h-64 place-items-center p-10 text-center">
            <h2 className="m-0 font-display text-2xl tracking-tight">
              No encontramos un restaurante asociado
            </h2>
          </Card>
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
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(18.75rem,0.82fr)_minmax(26rem,1.35fr)]">
              <Card accent="copper" className="overflow-hidden">
                <NumberedHeading
                  body="Usa buena luz y texto enfocado. Incluye cada página completa."
                  number="01"
                  title="Sube las fotos de tu carta"
                />
                <label className="relative mx-5 mt-2 mb-5 grid min-h-52 cursor-pointer content-center justify-items-center gap-2 rounded-xl border-[1.5px] border-dashed border-line-strong bg-olive-wash/35 p-7 text-center transition-colors hover:border-olive hover:bg-olive-wash/65 sm:mx-8">
                  <span
                    aria-hidden="true"
                    className="grid size-13 place-items-center rounded-full bg-paper text-2xl text-olive shadow-[0_0_0_1px_var(--color-line)]"
                  >
                    ↥
                  </span>
                  <strong className="text-sm">
                    {files.length ? 'Cambiar fotografías' : 'Seleccionar fotografías'}
                  </strong>
                  <small className="text-[11px]/relaxed text-ink-muted">
                    1–5 archivos · JPG, PNG o WebP · 3 MB por foto
                  </small>
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="Fotos de la carta"
                    className="absolute size-px opacity-0"
                    disabled={digitizing}
                    multiple
                    onChange={selectPhotos}
                    type="file"
                  />
                </label>
                {previews.length > 0 ? (
                  <div
                    aria-label="Fotografías seleccionadas"
                    className="grid grid-cols-2 gap-2.5 px-5 pb-5 sm:grid-cols-3 sm:px-8"
                  >
                    {previews.map(({ file, url }, index) => (
                      <figure className="m-0 min-w-0" key={`${file.name}-${file.lastModified}`}>
                        {/* A local object URL is intentionally rendered with a native image. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt={`Página ${index + 1}: ${file.name}`}
                          className="block aspect-4/5 w-full rounded-lg bg-control object-cover"
                          src={url}
                        />
                        <figcaption className="mt-1.5 flex justify-between gap-1.5 text-[9px] text-ink-muted">
                          <span className="overflow-hidden font-bold text-ellipsis whitespace-nowrap text-ink-soft">
                            Página {index + 1}
                          </span>
                          {formatBytes(file.size)}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                ) : null}
                <div className="px-5 sm:px-8">
                  <Button
                    disabled={digitizing || files.length === 0}
                    full
                    onClick={() => void digitize()}
                  >
                    {digitizing ? 'Digitalizando…' : 'Digitalizar en borrador'}
                  </Button>
                </div>
                <p className="mx-5 mt-3 mb-7 text-center text-[11px]/relaxed text-ink-muted sm:mx-8">
                  Las fotos se envían a Gemini para interpretarlas y no se almacenan en Sirio.
                </p>
              </Card>

              <Card accent="olive" className="min-h-[38rem] overflow-hidden">
                <NumberedHeading
                  body={
                    menu?.categories.length
                      ? 'Revisa el resultado antes de actualizar la carta pública.'
                      : 'Aquí aparecerá tu carta después de digitalizarla.'
                  }
                  number="02"
                  title="Tu borrador de carta"
                />
                <div
                  className={`flex items-start gap-2.5 border-b border-line px-5 py-3 sm:px-8 ${
                    menu?.publication.hasUnpublishedChanges
                      ? 'bg-copper-wash/60 text-copper'
                      : menu?.publication.hasPublishedMenu
                        ? 'bg-olive-wash/60 text-olive-hover'
                        : 'bg-control/55 text-ink-muted'
                  }`}
                  role="status"
                >
                  <span aria-hidden="true" className="pt-0.5 text-[11px]/none">
                    ●
                  </span>
                  <p className="m-0 text-[11px]/normal font-semibold">
                    {menu?.publication.hasUnpublishedChanges
                      ? 'Hay cambios en borrador. La carta pública conserva su versión anterior.'
                      : menu?.publication.hasPublishedMenu
                        ? 'Esta es la misma versión que está publicada ahora.'
                        : 'Aún no hay una carta publicada. Tu QR mostrará Próximamente.'}
                  </p>
                </div>
                {digitizing ? <ProcessingState stage={processingStage} /> : null}
                {!digitizing && menu ? (
                  <>
                    <div className="flex justify-end px-5 pb-1 sm:px-8">
                      <Link
                        className="inline-flex min-h-11 items-center text-[11px] font-extrabold text-olive no-underline hover:underline"
                        href={`/${selected.slug}`}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {menu.publication.hasPublishedMenu
                          ? 'Ver carta publicada ↗'
                          : 'Ver enlace del QR ↗'}
                      </Link>
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
              </Card>
            </div>
          </>
        ) : null}
      </Workspace>
    </AppShell>
  );
}

function ProcessingState({ stage }: { stage: number }) {
  return (
    <div
      aria-live="polite"
      className="grid min-h-[29rem] content-center justify-items-center p-10 text-center"
      role="status"
    >
      <span
        aria-hidden="true"
        className="relative block size-18 rounded-full border border-line-strong after:absolute after:inset-5 after:rounded-full after:bg-olive after:content-['']"
      >
        {[0, -0.6, -1.2].map((delay) => (
          <i
            className="absolute top-8.5 left-8.5 size-1 animate-orbit rounded-full bg-copper"
            key={delay}
            style={{ animationDelay: `${delay}s`, transform: 'translateX(2rem)' }}
          />
        ))}
      </span>
      <h3 className="mt-7 mb-2 font-display text-2xl tracking-[-0.025em]">
        Gemini está interpretando tu carta
      </h3>
      <p className="m-0 text-[13px] text-ink-soft">{PROCESSING_STAGES[stage]}</p>
      <div className="my-6 flex w-full max-w-70 gap-1.5">
        {PROCESSING_STAGES.map((_, index) => (
          <span
            className={`h-1.5 flex-1 rounded-full ${index <= stage ? 'bg-copper' : 'bg-control'}`}
            key={index}
          />
        ))}
      </div>
      <small className="text-[10px] text-ink-muted">
        No cierres esta ventana. Podrás revisar el borrador al terminar.
      </small>
    </div>
  );
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { message?: string | string[] };
  if (Array.isArray(body.message)) return body.message.join(' ');
  return body.message ?? 'No pudimos completar la operación. Vuelve a intentarlo.';
}
