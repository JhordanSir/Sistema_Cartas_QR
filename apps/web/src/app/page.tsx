import Image from 'next/image';
import Link from 'next/link';

import { BrandLockup } from '@/components/brand-lockup';
import { ButtonLink } from '@/components/button';
import { shellFontClassName } from '@/lib/fonts';

const CAPABILITIES = [
  {
    body: 'Sube una foto de tu carta y organiza categorías, precios, opciones e imágenes.',
    title: 'Digitaliza tu menú',
  },
  {
    body: 'Imprime un código permanente para que cada mesa llegue a la versión vigente de tu carta.',
    title: 'Comparte un QR único',
  },
  {
    body: 'Cambia disponibilidad al instante y revisa cuándo tus clientes consultan el menú.',
    title: 'Actualiza y entiende',
  },
];

const STEPS = ['Digitaliza', 'Publica', 'Comparte'];

export default function HomePage() {
  return (
    <main className={`min-h-dvh overflow-hidden bg-canvas text-ink ${shellFontClassName}`}>
      <div className="relative isolate mx-auto w-full max-w-[82.5rem] px-4 pt-5 sm:px-6 lg:px-16">
        {/* Concentric rings and hairline, purely decorative. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-40 -z-10 size-[28rem] rounded-full border border-copper/15 shadow-[0_0_0_5.5rem_rgb(172_86_53/0.035),0_0_0_11rem_rgb(172_86_53/0.02)] sm:-right-52 sm:size-[36rem] lg:top-40 lg:-right-60 lg:size-[42rem]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-24 bottom-28 left-4 -z-10 hidden w-px bg-gradient-to-b from-transparent via-olive/15 to-transparent sm:left-6 lg:left-[6%] lg:block"
        />

        <header className="flex min-h-13 items-center justify-between gap-4">
          <BrandLockup />
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              className="inline-flex min-h-11 items-center px-1 text-xs font-extrabold text-ink-soft no-underline hover:text-olive"
              href="/login"
            >
              Administración
            </Link>
            <Link
              className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 text-xs font-extrabold text-paper no-underline shadow-md transition-colors hover:bg-olive"
              href="/admin/login"
            >
              Ingresar como propietario
            </Link>
          </div>
        </header>

        <section
          aria-labelledby="hero-title"
          className="grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(23.75rem,0.82fr)] lg:gap-20 lg:py-28 xl:gap-28"
        >
          <div className="relative z-10">
            <p className="m-0 flex items-center gap-2.5 text-[10px] font-extrabold tracking-[0.16em] text-olive uppercase">
              <span aria-hidden="true" className="h-px w-5.5 bg-current" />
              Carta digital para restaurantes
            </p>
            <h1
              className="mt-5 mb-6 max-w-[11ch] font-display text-5xl leading-[0.9] font-semibold tracking-[-0.06em] text-balance sm:text-6xl lg:text-7xl xl:text-[5.625rem]"
              id="hero-title"
            >
              Tu carta trabaja <em className="text-copper not-italic">mientras atiendes.</em>
            </h1>
            <p className="m-0 max-w-[55ch] text-[15px]/[1.72] text-ink-soft text-pretty sm:text-base lg:text-lg">
              Convierte tu menú en una experiencia clara para cada mesa. Tus clientes escanean,
              consultan la carta vigente y tú conservas el control desde un solo lugar.
            </p>
            <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
              <ButtonLink
                className="min-h-12.5"
                href="/admin/login"
                tone="primary"
              >
                Ingresar a mi restaurante <span aria-hidden="true">→</span>
              </ButtonLink>
              <ButtonLink
                className="min-h-12.5"
                href="https://wa.me/51973502261"
                rel="noreferrer"
                target="_blank"
                tone="quiet"
              >
                Hablar con Sirio
              </ButtonLink>
            </div>
            <p className="mt-6 mb-0 text-[11px] font-bold text-ink-muted">
              Un QR permanente · Sin apps ni descargas para tus clientes
            </p>
          </div>

          <aside
            aria-label="Sirio conecta una carta con el código QR del restaurante"
            className="relative grid w-full max-w-[30rem] justify-items-center gap-0 justify-self-center overflow-hidden rounded-[2px_1.75rem_2px_1.75rem] border border-line bg-paper px-8 py-12 shadow-[1.25rem_1.25rem_0_var(--color-teal-wash),var(--shadow-soft)] sm:px-10 lg:min-h-[30rem] lg:content-center"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-5 border border-dashed border-olive/20"
            />
            <div className="absolute top-6 right-7 left-7 flex items-center justify-between text-[9px] font-extrabold tracking-[0.15em] text-ink-muted uppercase">
              <span>Servicio de carta</span>
              <span aria-hidden="true" className="text-xs text-copper">
                ●
              </span>
            </div>
            <div className="relative z-10 aspect-square w-full max-w-[13.5rem] overflow-hidden rounded-full border-[0.625rem] border-[#f3eadb] bg-[#0b1024] shadow-[0_0_0_1px_var(--color-line),0_1.125rem_2.25rem_rgb(41_39_31/0.18)]">
              <Image
                alt="Logo de Sirio Automatiza"
                className="object-cover"
                fill
                priority
                sizes="(max-width: 640px) 216px, 246px"
                src="/brand/sirio-logo.webp"
              />
            </div>
            <div aria-hidden="true" className="relative z-10 mt-6 flex flex-wrap justify-center gap-2">
              {STEPS.map((step, index) => (
                <span
                  className="inline-flex min-h-7 items-center gap-1.5 rounded-full bg-control px-2.5 py-1 text-[10px] font-bold text-ink-soft"
                  key={step}
                >
                  <b className="grid size-4 place-items-center rounded-full bg-olive text-[9px] text-white">
                    {index + 1}
                  </b>
                  {step}
                </span>
              ))}
            </div>
            <div className="relative z-10 mt-6 grid w-full max-w-[18.75rem] gap-2 text-center">
              <span className="inline-flex items-center justify-center gap-2 text-[10px] font-extrabold tracking-[0.12em] text-olive uppercase">
                <i
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-current shadow-[0_0_0_4px_var(--color-olive-wash)]"
                />
                Carta conectada
              </span>
              <strong className="max-w-[20ch] justify-self-center font-display text-2xl leading-none font-semibold tracking-[-0.045em] text-ink">
                De tu cocina a cada mesa.
              </strong>
            </div>
          </aside>
        </section>

        <section
          aria-labelledby="capabilities-title"
          className="grid gap-10 border-t border-line py-12 lg:grid-cols-[minmax(15.6rem,0.75fr)_minmax(0,1.25fr)] lg:gap-24 lg:py-16"
        >
          <div>
            <p className="m-0 flex items-center gap-2.5 text-[10px] font-extrabold tracking-[0.16em] text-olive uppercase">
              <span aria-hidden="true" className="h-px w-5.5 bg-current" />
              Todo en su sitio
            </p>
            <h2
              className="mt-4 mb-0 max-w-[13ch] font-display text-3xl leading-[0.94] font-semibold tracking-[-0.055em] text-balance sm:text-4xl lg:text-5xl"
              id="capabilities-title"
            >
              Una carta que sigue el ritmo de tu restaurante.
            </h2>
          </div>
          <div className="grid">
            {CAPABILITIES.map((capability, index) => (
              <article
                className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-4 border-b border-line pb-6 last:border-b-0 last:pb-0 [&:not(:last-child)]:mb-6 sm:gap-5"
                key={capability.title}
              >
                <span
                  aria-hidden="true"
                  className="font-display text-base font-bold tracking-tight text-copper"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="mt-0 mb-2 text-base font-bold tracking-tight text-ink">
                    {capability.title}
                  </h3>
                  <p className="m-0 max-w-[52ch] text-[13px]/relaxed text-ink-soft">
                    {capability.body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-line py-6 text-[10px] font-bold tracking-[0.06em] text-ink-muted uppercase sm:flex-row sm:items-center sm:justify-between">
          <span>Sirio Automatiza · Cartas QR</span>
          <span className="sm:text-right">Actualiza una vez. Llega a todas las mesas.</span>
        </footer>
      </div>
    </main>
  );
}
