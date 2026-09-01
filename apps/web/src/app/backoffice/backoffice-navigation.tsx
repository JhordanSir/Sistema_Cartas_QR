'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function BackofficeNavigation({ active }: { active: 'restaurants' | 'statistics' }) {
  const router = useRouter();

  async function logout() {
    await fetch('/api/session/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <aside className="side-rail">
      <Link className="brand-lockup" href="/">
        <span className="brand-mark" aria-hidden="true">S</span>
        <span>Sirio</span>
      </Link>
      <nav aria-label="Backoffice">
        <Link className={`nav-item ${active === 'restaurants' ? 'nav-item-active' : ''}`} href="/backoffice">
          <span aria-hidden="true">▦</span> Restaurantes
        </Link>
        <Link className={`nav-item ${active === 'statistics' ? 'nav-item-active' : ''}`} href="/backoffice/statistics">
          <span aria-hidden="true">◔</span> Estadísticas
        </Link>
      </nav>
      <button className="nav-item nav-button" onClick={logout} type="button">
        <span aria-hidden="true">↗</span> Cerrar sesión
      </button>
    </aside>
  );
}
