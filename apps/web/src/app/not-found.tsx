import { ButtonLink } from '@/components/button';
import { shellFontClassName } from '@/lib/fonts';

export default function NotFound() {
  return (
    <main
      className={`grid min-h-dvh place-items-center px-5 py-10 ${shellFontClassName}`}
    >
      <section className="w-full max-w-[37.5rem] rounded-3xl bg-paper p-7 shadow-soft sm:p-10 lg:p-12">
        <span
          aria-hidden="true"
          className="grid size-14 -rotate-6 place-items-center rounded-full border border-line-strong font-display font-bold text-copper"
        >
          404
        </span>
        <h1 className="mt-6 mb-4 max-w-[12ch] font-display text-4xl leading-none font-semibold tracking-[-0.045em] text-balance sm:text-5xl">
          Esta carta no está disponible.
        </h1>
        <p className="mt-0 mb-7 text-ink-soft leading-relaxed text-pretty">
          El restaurante puede estar temporalmente deshabilitado o la dirección ya no existe.
        </p>
        <ButtonLink href="/">Volver al inicio</ButtonLink>
      </section>
    </main>
  );
}
