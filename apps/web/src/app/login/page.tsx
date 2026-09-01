import Link from 'next/link';

import { SessionRedirect } from '../session-access';

import { LoginForm } from './login-form';

export default async function LoginPage() {
  return (
    <main className="login-shell">
      <SessionRedirect destination="/backoffice" role="ADMIN" />
      <Link className="brand-lockup" href="/" aria-label="Sirio Automatiza, inicio">
        <span className="brand-mark" aria-hidden="true">S</span>
        <span>Sirio Automatiza</span>
      </Link>
      <section className="login-card" aria-labelledby="login-title">
        <span className="kicker">Acceso de plataforma</span>
        <h1 id="login-title">Tu mesa de control.</h1>
        <p className="supporting-copy">
          Administra altas, disponibilidad y bajas definitivas de restaurantes.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
