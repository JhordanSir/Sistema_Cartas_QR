'use client';

import Image from 'next/image';
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
        <Image alt="" className="brand-mark-image" height={36} src="/brand/sirio-logo.webp" width={36} />
        <span>Sirio <b>Automatiza</b></span>
      </Link>
      <nav aria-label="Backoffice">
        <Link aria-current={active === 'restaurants' ? 'page' : undefined} className={`nav-item ${active === 'restaurants' ? 'nav-item-active' : ''}`} href="/backoffice">
          <span aria-hidden="true">▦</span> Restaurantes
        </Link>
        <Link aria-current={active === 'statistics' ? 'page' : undefined} className={`nav-item ${active === 'statistics' ? 'nav-item-active' : ''}`} href="/backoffice/statistics">
          <span aria-hidden="true">◔</span> Estadísticas
        </Link>
      </nav>
      <button className="nav-item nav-button" onClick={logout} type="button">
        <span aria-hidden="true">↗</span> Cerrar sesión
      </button>
    </aside>
  );
}
