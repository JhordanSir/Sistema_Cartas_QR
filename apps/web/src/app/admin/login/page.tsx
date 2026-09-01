import Link from 'next/link';

import { SessionRedirect } from '../../session-access';

import { OwnerLoginForm } from './owner-login-form';

export default async function OwnerLoginPage() {
  return (
    <main className="login-shell owner-login-shell">
      <SessionRedirect destination="/admin" role="OWNER" />
      <Link className="brand-lockup" href="/" aria-label="Sirio Automatiza, inicio">
        <span className="brand-mark" aria-hidden="true">S</span>
        <span>Sirio Automatiza</span>
      </Link>
      <section className="login-card" aria-labelledby="owner-login-title">
        <span className="kicker">Panel del restaurante</span>
        <h1 id="owner-login-title">Tu carta empieza aquí.</h1>
        <p className="supporting-copy">
          Completa la identidad de tu restaurante y prepara su presencia digital.
        </p>
        <OwnerLoginForm />
        <p className="login-help">
          ¿Olvidaste tu acceso? Escríbenos al <a href="https://wa.me/51973502261">+51 973 502 261</a>.
        </p>
      </section>
    </main>
  );
}
