import type { Metadata } from 'next';

import { requireOwnerPage } from '@/server/next/page-auth';

export const metadata: Metadata = { title: 'Perfil' };

// Provisional: the profile form arrives in phase 4.
export default async function OwnerHomePage() {
  const { restaurant } = await requireOwnerPage();
  return (
    <div className="grid gap-2">
      <p className="m-0 text-sm font-semibold text-ink-muted">Tu restaurante</p>
      <h1 className="m-0 font-display text-3xl font-semibold tracking-tight">{restaurant.name}</h1>
      <p className="m-0 max-w-prose text-[15px] text-ink-soft">
        Desde aquí editarás el perfil, la carta y el código QR de tu restaurante.
      </p>
    </div>
  );
}
