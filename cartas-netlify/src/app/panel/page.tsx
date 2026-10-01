import type { Metadata } from 'next';

import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/surfaces';
import { requireOwnerPage } from '@/server/next/page-auth';
import { getProfile, toProfileView } from '@/server/profile';

import { ProfileForm } from './profile-form';

export const metadata: Metadata = { title: 'Perfil' };

export default async function ProfilePage() {
  const { restaurant } = await requireOwnerPage();
  const profile = await getProfile(restaurant.id);
  if (!profile) throw new Error(`Restaurant ${restaurant.id} has no profile row.`);
  const view = toProfileView(profile);

  return (
    <div className="grid max-w-3xl gap-6">
      <div className="grid gap-1">
        <p className="m-0 text-sm font-semibold text-ink-muted">Perfil</p>
        <h1 className="m-0 font-display text-3xl font-semibold tracking-tight">{view.name}</h1>
      </div>

      <Card className="grid gap-4 p-6 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="grid min-w-0 gap-1">
          <h2 className="m-0 text-sm font-semibold text-ink-soft">Dirección de tu carta</h2>
          <p className="m-0 font-mono text-[15px] break-all text-ink" data-testid="direccion-publica">
            {view.publicUrl ?? `/${view.slug}`}
          </p>
          <p className="m-0 text-[13px] text-ink-muted">
            No cambia aunque edites el nombre del restaurante.
          </p>
        </div>
        <ButtonLink href={`/${view.slug}`} rel="noopener" target="_blank" variant="secondary">
          Ver carta pública
        </ButtonLink>
      </Card>

      <ProfileForm initialProfile={view} />
    </div>
  );
}
