import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="not-found-shell">
      <section>
        <span className="empty-stamp" aria-hidden="true">404</span>
        <h1>Esta carta no está disponible.</h1>
        <p>El restaurante puede estar temporalmente deshabilitado o la dirección ya no existe.</p>
        <Link className="button button-primary" href="/">Volver al inicio</Link>
      </section>
    </main>
  );
}
