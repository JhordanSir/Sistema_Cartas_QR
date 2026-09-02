'use client';

import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

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
    <main className="backoffice-shell owner-admin-shell">
      <OwnerNavigation active="qr" />
      <section className="workspace owner-workspace qr-workspace">
        <header className="workspace-header owner-workspace-header">
          <div>
            <span className="kicker">Comparte tu carta</span>
            <h1>Tu QR no cambia</h1>
            <p className="supporting-copy">
              Imprímelo una vez. La carta seguirá actualizándose detrás del mismo código.
            </p>
          </div>
          {restaurants.length > 1 ? (
            <label className="restaurant-switcher">
              <span>Restaurante</span>
              <select onChange={switchRestaurant} value={selected?.id}>
                {restaurants.map((restaurant) => (
                  <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>
                ))}
              </select>
            </label>
          ) : null}
        </header>

        {error ? <div className="error-banner" role="alert">{error}</div> : null}
        {loading ? <QrSkeleton /> : null}
        {!loading && !selected ? (
          <section className="profile-empty"><h2>No encontramos un restaurante asociado</h2></section>
        ) : null}
        {!loading && selected ? (
          <div className="qr-layout">
            <section className="qr-placard" aria-label={`QR permanente de ${selected.name}`}>
              <span className="qr-placard-kicker">Listo para compartir</span>
              <h2>{selected.name}</h2>
              <div className="qr-frame">
                {/* This authenticated SVG is generated server-side from the immutable slug. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={`Código QR de ${selected.name}`}
                  src={`/api/owner/restaurants/${selected.id}/qr/svg`}
                />
              </div>
              <strong>Escanea para ver la carta</strong>
              <small>{selected.slug}</small>
            </section>

            <section className="qr-actions-card">
              <span className="section-number">01</span>
              <div className="qr-action-copy">
                <span className="kicker">Listo para imprimir</span>
                <h2>Descárgalo y compártelo</h2>
                <p>PNG funciona bien para piezas rápidas. SVG conserva máxima nitidez en imprenta y gran formato.</p>
              </div>
              <div className="qr-downloads">
                <a
                  className="button button-primary"
                  download={`${selected.slug}-qr.png`}
                  href={`/api/owner/restaurants/${selected.id}/qr/png?download=true`}
                >Descargar PNG</a>
                <a
                  className="button button-secondary"
                  download={`${selected.slug}-qr.svg`}
                  href={`/api/owner/restaurants/${selected.id}/qr/svg?download=true`}
                >Descargar SVG</a>
              </div>
              <div className="permanent-url-block" role="status">
                <span>Enlace permanente</span>
                <code>{publicUrl || 'Preparando enlace…'}</code>
                <button disabled={!publicUrl} onClick={() => void copyPublicUrl()} type="button">
                  {copied ? 'Copiado' : 'Copiar enlace'}
                </button>
              </div>
              <div className="qr-guarantee">
                <span aria-hidden="true">✓</span>
                <p><strong>Este código está ligado al slug, no al contenido.</strong> Puedes cambiar platos, precios, disponibilidad o nombre visible sin reimprimirlo.</p>
              </div>
              {selected.status === 'DISABLED' ? (
                <div className="qr-disabled-note" role="status">
                  El QR sigue siendo válido, pero la carta pública permanecerá oculta hasta que el administrador reactive el restaurante.
                </div>
              ) : null}
              {publicUrl ? (
                <a className="qr-public-link" href={publicUrl} rel="noreferrer" target="_blank">
                  Probar enlace público ↗
                </a>
              ) : (
                <span className="qr-public-link">Preparando enlace público…</span>
              )}
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function QrSkeleton() {
  return (
    <div className="profile-skeleton qr-skeleton" aria-label="Cargando QR" role="status">
      <span />
      <span />
    </div>
  );
}
