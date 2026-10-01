import type { Metadata } from 'next';

import { requireAdminPage } from '@/server/next/page-auth';

export const metadata: Metadata = { title: 'Backoffice' };

// Provisional: the restaurant list arrives in phase 12.
export default async function BackofficePage() {
  await requireAdminPage();
  return (
    <div className="grid gap-2">
      <h1 className="m-0 font-display text-3xl font-semibold tracking-tight">Backoffice</h1>
      <p className="m-0 max-w-prose text-[15px] text-ink-soft">
        Aquí verás los restaurantes registrados para pausarlos, reactivarlos o restablecer sus contraseñas.
      </p>
    </div>
  );
}
