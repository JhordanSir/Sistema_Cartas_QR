import type { Metadata } from 'next';

import { Brand } from '@/components/brand';
import { ButtonLink } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Página no encontrada' };

/**
 * Global 404. It does not use the panel fonts on purpose: this boundary sits
 * in the tree of every page, and importing next/font here made the public
 * menu preload Fraunces and Inter. It falls back to Georgia and system-ui.
 */
export default function NotFound() {
  return (
    <div className="grid min-h-dvh content-center justify-items-center gap-8 bg-paper px-4 py-10 text-center font-sans text-ink">
      <Brand />
      <main className="grid max-w-md justify-items-center gap-3">
        <p className="m-0 font-display text-6xl font-semibold text-wine">404</p>
        <h1 className="m-0 font-display text-3xl font-semibold tracking-tight">
          Esta página no existe
        </h1>
        <p className="m-0 text-[15px] text-ink-soft">
          Revisa la dirección o vuelve al inicio para entrar a tu panel.
        </p>
        <ButtonLink className="mt-3" href="/entrar">
          Ir al inicio
        </ButtonLink>
      </main>
    </div>
  );
}
