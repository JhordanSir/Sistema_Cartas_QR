import Link from 'next/link';

/** "Sirio Cartas" set like the header of a printed menu: serif name over a double rule. */
export function Brand({ href = '/entrar' }: { href?: string }) {
  return (
    <Link
      aria-label="Sirio Cartas, inicio"
      className="inline-grid min-h-11 content-center justify-items-center gap-1 text-ink no-underline"
      href={href}
    >
      <span className="font-display text-2xl leading-none font-semibold tracking-tight">
        Sirio <span className="text-wine">Cartas</span>
      </span>
      <span aria-hidden="true" className="block h-[5px] w-full border-y border-ink/70" />
    </Link>
  );
}
