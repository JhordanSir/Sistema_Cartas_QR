'use client';

import { AppShell, PageTitle, SupportingCopy, Workspace, WorkspaceHeader } from '@/components/app-shell';
import { Kicker } from '@/components/surfaces';

import { OwnerNavigation } from '../owner-navigation';

import { ownerTutorials } from './tutorials';

export function OwnerHelpLibrary() {
  return (
    <AppShell navigation={<OwnerNavigation active="help" />}>
      <Workspace className="max-w-[74rem]">
        <WorkspaceHeader
          actions={
            <p className="inline-flex min-h-9 items-center gap-2 rounded-full bg-teal-wash px-3 text-[10px] font-extrabold tracking-[0.06em] text-teal uppercase">
              <span aria-hidden="true" className="text-olive">
                ●
              </span>
              Menos de 1 minuto por paso
            </p>
          }
        >
          <Kicker tone="teal">Guías rápidas</Kicker>
          <PageTitle className="max-w-[16ch]">
            Aprende a manejar tu carta desde el celular.
          </PageTitle>
          <SupportingCopy>
            Cinco videos cortos para completar, publicar y compartir tu carta sin salir del panel.
          </SupportingCopy>
        </WorkspaceHeader>

        <ol className="grid list-none gap-4 p-0 sm:gap-5">
          {ownerTutorials.map((tutorial, index) => (
            <li
              className="relative overflow-hidden rounded-2xl border border-line bg-paper shadow-soft before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-copper before:content-['']"
              key={tutorial.id}
            >
              <article className="grid items-center gap-5 p-5 pl-7 sm:gap-7 md:grid-cols-[minmax(0,1fr)_minmax(11rem,18rem)] md:p-6 md:pl-8">
                <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-3.5 sm:gap-4">
                  <span className="grid size-9 place-items-center rounded-lg border border-line-strong bg-canvas text-[11px] font-black text-copper">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="m-0 mb-1.5 text-[11px] font-extrabold tracking-[0.14em] text-teal uppercase">
                      Paso {index + 1}
                    </p>
                    <h2 className="mt-0 mb-2 max-w-[18ch] font-display text-2xl leading-tight font-semibold tracking-[-0.04em] text-ink sm:text-3xl">
                      {tutorial.title}
                    </h2>
                    <p className="m-0 max-w-[52ch] text-[13px]/relaxed font-medium text-ink-soft">
                      {tutorial.description}
                    </p>
                  </div>
                </div>
                <div className="w-full max-w-[16.5rem] justify-self-center rounded-[1.25rem] border border-line-strong bg-ink p-1.5 shadow-[0.5rem_0.5rem_0_var(--color-teal-wash)] md:justify-self-end">
                  <video
                    aria-describedby={`${tutorial.id}-description`}
                    className="block aspect-[9/16] w-full rounded-[0.8rem] bg-canvas object-cover"
                    controls
                    playsInline
                    poster={`/tutorials/${tutorial.id}.jpg`}
                    preload="metadata"
                  >
                    <source src={`/tutorials/${tutorial.id}.mp4`} type="video/mp4" />
                    <track
                      default
                      kind="subtitles"
                      label="Español"
                      src={`/tutorials/${tutorial.id}.vtt`}
                      srcLang="es"
                    />
                    Tu navegador no puede reproducir este video.
                  </video>
                </div>
                <p className="sr-only" id={`${tutorial.id}-description`}>
                  {tutorial.description}
                </p>
              </article>
            </li>
          ))}
        </ol>
      </Workspace>
    </AppShell>
  );
}
