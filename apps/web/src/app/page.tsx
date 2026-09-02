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
          <div className="landing-nav-actions">
            <Link className="landing-admin-link" href="/login">Administración</Link>
            <Link className="landing-login-link" href="/admin/login">Ingresar como propietario</Link>
          </div>
        </header>

        <section className="landing-hero" aria-labelledby="hero-title">
          <div className="landing-copy">
            <p className="landing-kicker"><span aria-hidden="true" /> Carta digital para restaurantes</p>
            <h1 id="hero-title">Tu carta trabaja <em>mientras atiendes.</em></h1>
            <p className="landing-lede">
              Convierte tu menú en una experiencia clara para cada mesa. Tus clientes escanean,
              consultan la carta vigente y tú conservas el control desde un solo lugar.
            </p>
            <div className="landing-actions">
              <Link className="landing-button landing-button-primary" href="/admin/login">
                Ingresar a mi restaurante <span aria-hidden="true">→</span>
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
            <p className="landing-proof">Un QR permanente · Sin apps ni descargas para tus clientes</p>
          </div>

          <aside className="landing-service-card" aria-label="Sirio conecta una carta con el código QR del restaurante">
            <div className="landing-card-topline">
              <span>Servicio de carta</span>
              <span aria-hidden="true">●</span>
            </div>
            <div className="landing-logo-frame">
              <Image
                alt="Logo de Sirio Automatiza"
                fill
                priority
                sizes="(max-width: 760px) 220px, 360px"
                src="/brand/sirio-logo.webp"
              />
            </div>
            <div className="landing-service-steps" aria-hidden="true">
              <span><b>1</b> Digitaliza</span>
              <span><b>2</b> Publica</span>
              <span><b>3</b> Comparte</span>
            </div>
            <div className="landing-card-caption">
              <span className="landing-status"><i aria-hidden="true" /> Carta conectada</span>
              <strong>De tu cocina a cada mesa.</strong>
            </div>
          </aside>
        </section>

        <section className="landing-capabilities" aria-labelledby="capabilities-title">
          <div className="landing-section-heading">
            <p className="landing-kicker"><span aria-hidden="true" /> Todo en su sitio</p>
            <h2 id="capabilities-title">Una carta que sigue el ritmo de tu restaurante.</h2>
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
          <span>Sirio Automatiza · Cartas QR</span>
          <span>Actualiza una vez. Llega a todas las mesas.</span>
        </footer>
      </div>
    </main>
  );
}
