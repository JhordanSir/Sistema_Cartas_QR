'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { RestaurantProfile } from '@/lib/restaurant-types';

import { OwnerNavigation } from './owner-navigation';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ACCEPTED_LOGOS = ['image/jpeg', 'image/png', 'image/webp'];

export function RestaurantProfilePanel() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<RestaurantProfile[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const selected = useMemo(
    () => restaurants.find((restaurant) => restaurant.id === selectedId) ?? restaurants[0],
    [restaurants, selectedId],
  );

  const loadRestaurants = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await fetch('/api/owner/restaurants', { cache: 'no-store' });
    if (response.status === 401 || response.status === 403) {
      router.replace('/admin/login');
      return;
    }
    if (!response.ok) {
      setError('No pudimos cargar el perfil. Vuelve a intentarlo.');
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
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  function selectLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setError(null);
    if (!file) return;
    if (!ACCEPTED_LOGOS.includes(file.type) || file.size > MAX_LOGO_BYTES) {
      event.target.value = '';
      setLogo(null);
      setError('El logo debe ser PNG, JPG o WebP y pesar como máximo 2 MB.');
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setLogo(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    const form = new FormData(event.currentTarget);
    if (logo) form.set('logo', logo);
    const response = await fetch(`/api/owner/restaurants/${selected.id}/profile`, {
      body: form,
      method: 'PATCH',
    });
    if (!response.ok) {
      setError(await readApiError(response));
      setSaving(false);
      return;
    }
    const updated = (await response.json()) as RestaurantProfile;
    setRestaurants((current) =>
      current.map((restaurant) => restaurant.id === updated.id ? updated : restaurant),
    );
    setLogo(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setNotice('Perfil guardado. La identidad de tu restaurante está al día.');
    setSaving(false);
  }

  return (
    <main className="backoffice-shell owner-admin-shell">
      <OwnerNavigation active="profile" />

      <section className="workspace owner-workspace">
        <header className="workspace-header owner-workspace-header">
          <div>
            <span className="kicker">Identidad del restaurante</span>
            <h1>Tu perfil</h1>
            <p className="supporting-copy">
              Esta información acompañará tu carta y ayudará a tus clientes a encontrarte.
            </p>
          </div>
          {restaurants.length > 1 ? (
            <label className="restaurant-switcher">
              <span>Restaurante</span>
              <select onChange={(event) => setSelectedId(event.target.value)} value={selected?.id}>
                {restaurants.map((restaurant) => (
                  <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>
                ))}
              </select>
            </label>
          ) : null}
        </header>

        {notice ? <div className="notice" role="status">{notice}</div> : null}
        {error ? <div className="error-banner" role="alert">{error}</div> : null}
        {loading ? <ProfileSkeleton /> : null}
        {!loading && !selected ? (
          <section className="profile-empty">
            <span className="empty-stamp" aria-hidden="true">S/</span>
            <h2>No encontramos un restaurante asociado</h2>
            <p>Contacta al administrador para revisar tu cuenta.</p>
          </section>
        ) : null}
        {!loading && selected ? (
          <ProfileForm
            key={`${selected.id}-${selected.updatedAt}`}
            logo={logo}
            onLogoChange={selectLogo}
            onSubmit={saveProfile}
            previewUrl={previewUrl}
            profile={selected}
            saving={saving}
          />
        ) : null}
      </section>
    </main>
  );
}

function ProfileForm({
  logo,
  onLogoChange,
  onSubmit,
  previewUrl,
  profile,
  saving,
}: {
  logo: File | null;
  onLogoChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  previewUrl: string | null;
  profile: RestaurantProfile;
  saving: boolean;
}) {
  const persistedLogo = profile.logoPath
    ? `/api/owner/restaurants/${profile.id}/logo?v=${encodeURIComponent(profile.updatedAt)}`
    : null;
  const logoUrl = previewUrl ?? persistedLogo;
  const completed = [
    profile.logoPath,
    profile.contactPhone,
    profile.whatsapp,
    profile.address,
    profile.instagramUrl || profile.facebookUrl || profile.tiktokUrl,
  ].filter(Boolean).length;

  return (
    <form className="profile-layout" onSubmit={onSubmit}>
      <aside className="identity-card" aria-label="Vista previa de identidad">
        <span className="ticket-number">Vista previa</span>
        <div className="logo-preview">
          {logoUrl ? (
            <Image
              alt={`Logo de ${profile.name}`}
              fill
              sizes="160px"
              src={logoUrl}
              unoptimized
            />
          ) : (
            <span aria-hidden="true">{profile.name.charAt(0).toLocaleUpperCase('es')}</span>
          )}
        </div>
        <h2>{profile.name}</h2>
        <a href={`/${profile.slug}`} rel="noreferrer" target="_blank">/{profile.slug}</a>
        <div className="profile-progress" aria-label={`${completed} de 5 datos completados`}>
          <div><span style={{ width: `${completed * 20}%` }} /></div>
          <p><strong>{completed}/5</strong> señales de confianza completas</p>
        </div>
        <label className="logo-picker">
          <span>{logo ? 'Cambiar selección' : profile.logoPath ? 'Reemplazar logo' : 'Subir logo'}</span>
          <input
            accept="image/png,image/jpeg,image/webp"
            aria-label="Logo del restaurante"
            name="logo"
            onChange={onLogoChange}
            type="file"
          />
        </label>
        <small>PNG, JPG o WebP · máximo 2 MB</small>
      </aside>

      <section className="profile-form-card">
        <div className="profile-section-heading">
          <span className="section-number">01</span>
          <div>
            <h2>Contacto y ubicación</h2>
            <p>Datos opcionales para que tus clientes puedan ubicarte o escribirte.</p>
          </div>
        </div>
        <div className="profile-fields">
          <label className="field">
            <span>Teléfono</span>
            <input defaultValue={profile.contactPhone ?? ''} inputMode="tel" maxLength={32} name="contactPhone" placeholder="(01) 555 0123" />
          </label>
          <label className="field">
            <span>WhatsApp</span>
            <input defaultValue={profile.whatsapp ?? ''} inputMode="tel" maxLength={32} name="whatsapp" placeholder="+51 999 999 999" />
          </label>
          <label className="field field-wide">
            <span>Dirección</span>
            <input defaultValue={profile.address ?? ''} maxLength={500} name="address" placeholder="Av. Principal 123, Miraflores" />
          </label>
        </div>

        <div className="profile-section-heading profile-section-divider">
          <span className="section-number">02</span>
          <div>
            <h2>Redes sociales</h2>
            <p>Usa enlaces completos y seguros que comiencen con https://.</p>
          </div>
        </div>
        <div className="profile-fields">
          <label className="field field-wide">
            <span>Instagram</span>
            <input defaultValue={profile.instagramUrl ?? ''} maxLength={2048} name="instagramUrl" placeholder="https://instagram.com/tu_restaurante" type="url" />
          </label>
          <label className="field">
            <span>Facebook</span>
            <input defaultValue={profile.facebookUrl ?? ''} maxLength={2048} name="facebookUrl" placeholder="https://facebook.com/tu-restaurante" type="url" />
          </label>
          <label className="field">
            <span>TikTok</span>
            <input defaultValue={profile.tiktokUrl ?? ''} maxLength={2048} name="tiktokUrl" placeholder="https://tiktok.com/@tu_restaurante" type="url" />
          </label>
        </div>

        <footer className="profile-actions">
          <p>El nombre y la URL solo pueden ser modificados por el administrador.</p>
          <button className="button button-primary" disabled={saving} type="submit">
            {saving ? 'Guardando…' : 'Guardar perfil'}
          </button>
        </footer>
      </section>
    </form>
  );
}

function ProfileSkeleton() {
  return (
    <div className="profile-skeleton" aria-label="Cargando perfil" role="status">
      <span />
      <span />
    </div>
  );
}

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as {
    message?: string | string[];
  };
  if (Array.isArray(body.message)) return body.message.join(' ');
  return body.message ?? 'No pudimos guardar el perfil. Vuelve a intentarlo.';
}
