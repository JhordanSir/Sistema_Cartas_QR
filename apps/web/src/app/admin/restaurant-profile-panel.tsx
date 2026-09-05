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

import { AppShell, PageTitle, SupportingCopy, Workspace, WorkspaceHeader } from '@/components/app-shell';
import { Button } from '@/components/button';
import { Field, fieldControl } from '@/components/field';
import { RestaurantSwitcher } from '@/components/restaurant-switcher';
import { Card, ErrorBanner, Kicker, Notice, NumberedHeading, Skeleton } from '@/components/surfaces';
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
    <AppShell navigation={<OwnerNavigation active="profile" />}>
      <Workspace className="max-w-[80rem]">
        <WorkspaceHeader
          actions={
            <RestaurantSwitcher
              onChange={(event) => setSelectedId(event.target.value)}
              restaurants={restaurants}
              selectedId={selected?.id}
            />
          }
        >
          <Kicker>Panel del restaurante</Kicker>
          <PageTitle>Tu perfil</PageTitle>
          <SupportingCopy>
            Haz que las personas reconozcan tu restaurante y sepan cómo encontrarte.
          </SupportingCopy>
        </WorkspaceHeader>

        {notice ? <Notice onDismiss={() => setNotice(null)}>{notice}</Notice> : null}
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
        {loading ? (
          <div
            aria-label="Cargando perfil"
            className="grid gap-6 lg:grid-cols-[minmax(15rem,20rem)_minmax(0,1fr)]"
            role="status"
          >
            <Skeleton className="min-h-60" />
            <Skeleton className="min-h-[32rem]" />
          </div>
        ) : null}
        {!loading && !selected ? (
          <Card className="grid min-h-[22rem] content-center justify-items-center p-10 text-center">
            <span
              aria-hidden="true"
              className="grid size-14 -rotate-6 place-items-center rounded-full border border-line-strong font-display font-bold text-copper"
            >
              S/
            </span>
            <h2 className="mt-5 mb-0 font-display text-2xl tracking-tight">
              No encontramos un restaurante asociado
            </h2>
            <p className="mt-1.5 mb-0 text-[13px]/relaxed text-ink-soft">
              Contacta al administrador para revisar tu cuenta.
            </p>
          </Card>
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
      </Workspace>
    </AppShell>
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
    <form
      className="grid items-start gap-6 lg:grid-cols-[minmax(15rem,20rem)_minmax(0,1fr)]"
      onSubmit={onSubmit}
    >
      <Card
        accent="teal"
        className="grid justify-items-center p-7 text-center lg:sticky lg:top-8"
      >
        <Kicker className="justify-self-start" tone="teal">
          Así te verán
        </Kicker>
        <div className="relative mt-7 mb-5 grid size-32 place-items-center overflow-hidden rounded-[2rem] bg-olive-wash font-display text-5xl font-bold text-olive shadow-[inset_0_0_0_1px_rgb(29_41_33/0.1)] sm:size-40 sm:rounded-[2.25rem] sm:text-6xl">
          {logoUrl ? (
            <Image alt={`Logo de ${profile.name}`} fill sizes="160px" src={logoUrl} unoptimized />
          ) : (
            <span aria-hidden="true">{profile.name.charAt(0).toLocaleUpperCase('es')}</span>
          )}
        </div>
        <h2 className="m-0 max-w-[14ch] font-display text-3xl leading-tight tracking-[-0.035em] text-balance">
          {profile.name}
        </h2>
        <a
          className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-olive-wash px-3 text-xs font-extrabold text-olive no-underline hover:bg-olive-wash/70"
          href={`/${profile.slug}`}
          rel="noreferrer"
          target="_blank"
        >
          <span aria-hidden="true">↗</span> Abrir carta pública
        </a>
        <div
          aria-label={`${completed} de 5 datos completados`}
          className="my-6 w-full border-y border-line py-5"
        >
          <div className="h-1.5 overflow-hidden rounded-full bg-control">
            <span
              className="block h-full rounded-full bg-copper transition-[width] duration-200 ease-soft"
              style={{ width: `${completed * 20}%` }}
            />
          </div>
          <p className="mt-2.5 mb-0 text-[11px] text-ink-muted">
            <strong className="text-ink tabular-nums">{completed}/5</strong> datos que ayudan a tus
            clientes
          </p>
        </div>
        <label className="relative inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-lg bg-control px-4 text-[13px] font-bold text-ink hover:bg-control-hover">
          <span>
            {logo ? 'Cambiar selección' : profile.logoPath ? 'Reemplazar logo' : 'Subir logo'}
          </span>
          <input
            accept="image/png,image/jpeg,image/webp"
            aria-label="Logo del restaurante"
            className="absolute size-px opacity-0"
            name="logo"
            onChange={onLogoChange}
            type="file"
          />
        </label>
        <small className="mt-2 text-[10px] text-ink-muted">PNG, JPG o WebP · máximo 2 MB</small>
      </Card>

      <Card className="overflow-hidden">
        <NumberedHeading
          body="Agrega los datos que tus clientes necesitan para ubicarte o escribirte."
          number="01"
          title="Cómo te encuentran"
        />
        <div className="grid gap-4 px-5 pt-2 pb-6 sm:grid-cols-2 sm:px-8">
          <Field label="Teléfono">
            <input
              className={fieldControl}
              defaultValue={profile.contactPhone ?? ''}
              inputMode="tel"
              maxLength={32}
              name="contactPhone"
              placeholder="(01) 555 0123"
            />
          </Field>
          <Field label="WhatsApp">
            <input
              className={fieldControl}
              defaultValue={profile.whatsapp ?? ''}
              inputMode="tel"
              maxLength={32}
              name="whatsapp"
              placeholder="+51 999 999 999"
            />
          </Field>
          <Field className="sm:col-span-2" label="Dirección">
            <input
              className={fieldControl}
              defaultValue={profile.address ?? ''}
              maxLength={500}
              name="address"
              placeholder="Av. Principal 123, Miraflores"
            />
          </Field>
        </div>

        <NumberedHeading
          body="Usa enlaces completos que comiencen con https://."
          divider
          number="02"
          title="Dónde te siguen"
        />
        <div className="grid gap-4 px-5 pt-2 pb-6 sm:grid-cols-2 sm:px-8">
          <Field className="sm:col-span-2" label="Instagram">
            <input
              className={fieldControl}
              defaultValue={profile.instagramUrl ?? ''}
              maxLength={2048}
              name="instagramUrl"
              placeholder="https://instagram.com/tu_restaurante"
              type="url"
            />
          </Field>
          <Field label="Facebook">
            <input
              className={fieldControl}
              defaultValue={profile.facebookUrl ?? ''}
              maxLength={2048}
              name="facebookUrl"
              placeholder="https://facebook.com/tu-restaurante"
              type="url"
            />
          </Field>
          <Field label="TikTok">
            <input
              className={fieldControl}
              defaultValue={profile.tiktokUrl ?? ''}
              maxLength={2048}
              name="tiktokUrl"
              placeholder="https://tiktok.com/@tu_restaurante"
              type="url"
            />
          </Field>
        </div>

        <footer className="flex flex-col gap-4 bg-control/55 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="m-0 max-w-[48ch] text-[11px]/relaxed text-ink-muted">
            El nombre y la dirección pública los administra la plataforma.
          </p>
          <Button className="max-sm:w-full" disabled={saving} type="submit">
            {saving ? 'Guardando…' : 'Guardar perfil'}
          </Button>
        </footer>
      </Card>
    </form>
  );
}

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as {
    message?: string | string[];
  };
  if (Array.isArray(body.message)) return body.message.join(' ');
  return body.message ?? 'No pudimos guardar el perfil. Vuelve a intentarlo.';
}
