'use client';

import { OwnerNavigation } from '../owner-navigation';

import { ownerTutorials } from './tutorials';

export function OwnerHelpLibrary() {
  return (
    <main className="backoffice-shell owner-admin-shell">
      <OwnerNavigation active="help" />
      <section className="workspace owner-workspace help-workspace">
        <header className="workspace-header owner-workspace-header help-header">
          <div>
            <span className="ticket-number">Guías rápidas</span>
            <h1>Aprende a manejar tu carta desde el celular.</h1>
            <p className="supporting-copy">Cinco videos cortos para completar, publicar y compartir tu carta sin salir del panel.</p>
          </div>
          <p className="help-header-note"><span aria-hidden="true">●</span> Menos de 1 minuto por paso</p>
        </header>

        <ol className="help-tutorial-list">
          {ownerTutorials.map((tutorial, index) => (
            <li className="help-tutorial" key={tutorial.id}>
              <article>
                <div className="help-tutorial-copy">
                  <span className="help-tutorial-index">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <p className="ticket-number">Paso {index + 1}</p>
                    <h2>{tutorial.title}</h2>
                    <p>{tutorial.description}</p>
                  </div>
                </div>
                <div className="help-video-frame">
                  <video
                    aria-describedby={`${tutorial.id}-description`}
                    controls
                    playsInline
                    poster={`/tutorials/${tutorial.id}.jpg`}
                    preload="metadata"
                  >
                    <source src={`/tutorials/${tutorial.id}.mp4`} type="video/mp4" />
                    <track default kind="subtitles" label="Español" src={`/tutorials/${tutorial.id}.vtt`} srcLang="es" />
                    Tu navegador no puede reproducir este video.
                  </video>
                </div>
                <p className="sr-only" id={`${tutorial.id}-description`}>{tutorial.description}</p>
              </article>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
