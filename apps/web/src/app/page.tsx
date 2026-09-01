import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="landing-shell">
      <div className="landing-inner">
        <header className="landing-nav">
          <Link className="landing-brand" href="/" aria-label="Sirio Automatiza, inicio">
            <Image
              alt=""
              className="landing-brand-logo"
              height={44}
              priority
              src="/brand/sirio-logo.webp"
              width={44}
            />
            <span>Sirio <b>Automatiza</b></span>
          </Link>
          <Link className="landing-login-link" href="/admin/login">
            Ingresar al panel <span aria-hidden="true">↗</span>
          </Link>
        </header>

        <section className="landing-hero" aria-labelledby="hero-title">
          <div className="landing-copy">
            <p className="landing-kicker"><span aria-hidden="true" /> Tecnología para restaurantes</p>
            <h1 id="hero-title">Tu carta trabaja <em>mientras atiendes.</em></h1>
            <p className="landing-lede">
              Convierte tu menú en una experiencia digital: tus clientes escanean
              un QR, ven siempre la carta actual y tú controlas cada cambio desde un solo lugar.
            </p>
            <div className="landing-actions">
              <Link className="landing-button landing-button-primary" href="/admin/login">
                Ingresar como propietario <span aria-hidden="true">→</span>
              </Link>
              <a
                className="landing-button landing-button-quiet"
                href="https://wa.me/51973502261"
                rel="noreferrer"
                target="_blank"
              >
                Hablar con Sirio
              </a>
            </div>
            <p className="landing-proof">Un QR permanente · Sin aplicaciones para tus clientes</p>
          </div>

          <aside className="landing-system-card" aria-label="Sirio convierte una carta en un menú QR">
            <div className="landing-orbit landing-orbit-one" aria-hidden="true" />
            <div className="landing-orbit landing-orbit-two" aria-hidden="true" />
            <div className="landing-signal landing-signal-top" aria-hidden="true" />
            <div className="landing-signal landing-signal-bottom" aria-hidden="true" />
            <div className="landing-logo-frame">
              <Image
                alt="Logo de Sirio Automatiza"
                fill
                priority
                sizes="(max-width: 760px) 220px, 360px"
                src="/brand/sirio-logo.webp"
              />
            </div>
            <div className="landing-card-caption">
              <span className="landing-status"><i aria-hidden="true" /> Carta conectada</span>
              <strong>Del menú de tu cocina a cada mesa.</strong>
            </div>
          </aside>
        </section>

        <section className="landing-capabilities" aria-labelledby="capabilities-title">
          <div className="landing-section-heading">
            <p className="landing-kicker"><span aria-hidden="true" /> Todo en su sitio</p>
            <h2 id="capabilities-title">Una carta que se adapta al ritmo de tu restaurante.</h2>
          </div>
          <div className="landing-feature-list">
            <article>
              <span className="landing-feature-icon" aria-hidden="true">01</span>
              <div>
                <h3>Digitaliza tu menú</h3>
                <p>Sube una foto de tu carta y organiza categorías, precios, opciones e imágenes.</p>
              </div>
            </article>
            <article>
              <span className="landing-feature-icon" aria-hidden="true">02</span>
              <div>
                <h3>Comparte un QR único</h3>
                <p>Imprime un código permanente para que cada mesa llegue a la versión vigente de tu carta.</p>
              </div>
            </article>
            <article>
              <span className="landing-feature-icon" aria-hidden="true">03</span>
              <div>
                <h3>Actualiza y entiende</h3>
                <p>Cambia disponibilidad al instante y revisa cuándo tus clientes consultan el menú.</p>
              </div>
            </article>
          </div>
        </section>

        <footer className="landing-footer">
          <span>Sirio Automatiza</span>
          <span>Cartas digitales que no se quedan quietas.</span>
        </footer>
      </div>
    </main>
  );
}
