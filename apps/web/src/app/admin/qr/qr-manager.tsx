'use client';

import { useRouter } from 'next/navigation';
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { AppShell, PageTitle, SupportingCopy, Workspace, WorkspaceHeader } from '@/components/app-shell';
import { ButtonLink } from '@/components/button';
import { RestaurantSwitcher } from '@/components/restaurant-switcher';
import { Card, ErrorBanner, Kicker, Skeleton } from '@/components/surfaces';
import type { RestaurantProfile } from '@/lib/restaurant-types';

import { OwnerNavigation } from '../owner-navigation';

interface QrIdentity {
  publicUrl: string;
}

export function QrManager() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<RestaurantProfile[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [qrIdentity, setQrIdentity] = useState<{
    publicUrl: string;
    restaurantId: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const selected = useMemo(
    () => restaurants.find((restaurant) => restaurant.id === selectedId) ?? restaurants[0],
    [restaurants, selectedId],
  );
  const selectedRestaurantId = selected?.id;
  const publicUrl = qrIdentity && qrIdentity.restaurantId === selectedRestaurantId
    ? qrIdentity.publicUrl
    : '';

  const loadRestaurants = useCallback(async () => {
    setLoading(true);
    const response = await fetch('/api/owner/restaurants', { cache: 'no-store' });
    if (response.status === 401 || response.status === 403) {
      router.replace('/admin/login');
      return;
    }
    if (!response.ok) {
      setError('No pudimos cargar el QR de tu restaurante.');
      setLoading(false);
      return;
    }
    const profiles = (await response.json()) as RestaurantProfile[];
    setRestaurants(profiles);
    setSelectedId((current) => current || profiles[0]?.id || '');
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadRestaurants(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadRestaurants]);

  useEffect(() => {
    if (!selectedRestaurantId) return undefined;

    let active = true;
    void fetch(`/api/owner/restaurants/${selectedRestaurantId}/qr`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('QR identity request failed');
        return response.json() as Promise<QrIdentity>;
      })
      .then((identity) => {
        if (active) {
          setQrIdentity({ publicUrl: identity.publicUrl, restaurantId: selectedRestaurantId });
        }
      })
      .catch(() => {
        if (active) setError('No pudimos cargar el enlace permanente del QR.');
      });
    return () => {
      active = false;
    };
  }, [selectedRestaurantId]);

  function switchRestaurant(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedId(event.target.value);
    setCopied(false);
    setError(null);
  }

  async function copyPublicUrl() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
    } catch {
      setError('No pudimos copiar el enlace. Selecciónalo manualmente.');
    }
  }

  return (
    <AppShell navigation={<OwnerNavigation active="qr" />}>
      <Workspace className="max-w-[74rem]">
        <WorkspaceHeader
          actions={
            <RestaurantSwitcher
              onChange={switchRestaurant}
              restaurants={restaurants}
              selectedId={selected?.id}
            />
          }
        >
          <Kicker>Comparte tu carta</Kicker>
          <PageTitle>Tu QR no cambia</PageTitle>
          <SupportingCopy>
            Imprímelo una vez. La carta seguirá actualizándose detrás del mismo código.
          </SupportingCopy>
        </WorkspaceHeader>

        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
        {loading ? (
          <div
            aria-label="Cargando QR"
            className="grid gap-6 lg:grid-cols-[minmax(18.75rem,0.82fr)_minmax(26rem,1.18fr)]"
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
          <div className="grid items-center gap-6 lg:grid-cols-[minmax(18.75rem,0.82fr)_minmax(26rem,1.18fr)] lg:gap-10">
            <Card
              accent="teal"
              aria-label={`QR permanente de ${selected.name}`}
              className="relative grid justify-items-center p-6 text-center sm:p-9"
            >
              {/* Ticket notches, cosmetic. */}
              <span
                aria-hidden="true"
                className="absolute top-1/2 -left-2.5 hidden h-10 w-5 -translate-y-1/2 rounded-full bg-canvas lg:block"
              />
              <span
                aria-hidden="true"
                className="absolute top-1/2 -right-2.5 hidden h-10 w-5 -translate-y-1/2 rounded-full bg-canvas lg:block"
              />
              <Kicker className="tracking-[0.18em]" tone="copper">
                Listo para compartir
              </Kicker>
              <h2 className="mt-3 mb-6 max-w-[12ch] font-display text-3xl leading-none sm:text-4xl">
                {selected.name}
              </h2>
              <div className="grid aspect-square w-full max-w-[18.75rem] place-items-center rounded-xl bg-white p-4 shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)]">
                {/* This authenticated SVG is generated server-side from the immutable slug. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={`Código QR de ${selected.name}`}
                  className="block size-full"
                  src={`/api/owner/restaurants/${selected.id}/qr/svg`}
                />
              </div>
              <strong className="mt-6 text-sm">Escanea para ver la carta</strong>
              <small className="mt-1.5 text-[10px] tracking-wider text-ink-muted">
                {selected.slug}
              </small>
            </Card>

            <Card accent="olive" className="grid gap-5 p-6 sm:p-9">
              <div className="flex gap-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-olive-wash font-display text-[13px] font-extrabold text-olive">
                  01
                </span>
                <div>
                  <Kicker>Listo para imprimir</Kicker>
                  <h2 className="mt-1.5 mb-2.5 font-display text-2xl tracking-[-0.03em] sm:text-3xl">
                    Descárgalo y compártelo
                  </h2>
                  <p className="m-0 max-w-[58ch] text-[13px]/relaxed text-ink-soft">
                    PNG funciona bien para piezas rápidas. SVG conserva máxima nitidez en imprenta y
                    gran formato.
                  </p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <ButtonLink
                  download={`${selected.slug}-qr.png`}
                  href={`/api/owner/restaurants/${selected.id}/qr/png?download=true`}
                >
                  Descargar PNG
                </ButtonLink>
                <ButtonLink
                  download={`${selected.slug}-qr.svg`}
                  href={`/api/owner/restaurants/${selected.id}/qr/svg?download=true`}
                  tone="secondary"
                >
                  Descargar SVG
                </ButtonLink>
              </div>

              <div className="grid gap-2 rounded-xl bg-control p-4" role="status">
                <span className="text-[9px] font-extrabold tracking-[0.12em] text-ink-muted uppercase">
                  Enlace permanente
                </span>
                <code className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-ink-soft">
                  {publicUrl || 'Preparando enlace…'}
                </code>
                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-paper px-3 text-[11px] font-extrabold text-olive disabled:opacity-45"
                  disabled={!publicUrl}
                  onClick={() => void copyPublicUrl()}
                  type="button"
                >
                  {copied ? 'Copiado' : 'Copiar enlace'}
                </button>
              </div>

              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="grid size-7 shrink-0 place-items-center rounded-full bg-olive-wash font-black text-olive"
                >
                  ✓
                </span>
                <p className="m-0 text-xs/relaxed text-ink-soft">
                  <strong className="text-ink">
                    Este código está ligado al slug, no al contenido.
                  </strong>{' '}
                  Puedes cambiar platos, precios, disponibilidad o nombre visible sin reimprimirlo.
                </p>
              </div>

              {selected.status === 'DISABLED' ? (
                <p
                  className="m-0 rounded-lg bg-danger-wash px-3.5 py-3 text-[11px]/relaxed text-danger"
                  role="status"
                >
                  El QR sigue siendo válido, pero la carta pública permanecerá oculta hasta que el
                  administrador reactive el restaurante.
                </p>
              ) : null}

              {publicUrl ? (
                <a
                  className="justify-self-end text-xs font-extrabold text-olive no-underline hover:underline"
                  href={publicUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Probar enlace público ↗
                </a>
              ) : (
                <span className="justify-self-end text-xs font-extrabold text-ink-muted">
                  Preparando enlace público…
                </span>
              )}
            </Card>
          </div>
        ) : null}
      </Workspace>
    </AppShell>
  );
}
