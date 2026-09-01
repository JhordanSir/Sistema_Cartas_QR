'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function OwnerNavigation({ active }: { active: 'menu' | 'profile' | 'qr' | 'statistics' }) {
  const router = useRouter();

  async function logout() {
    await fetch('/api/session/logout', { method: 'POST' });
    router.replace('/admin/login');
    router.refresh();
  }

  return (
    <aside className="side-rail">
      <Link className="brand-lockup" href="/">
        <span className="brand-mark" aria-hidden="true">S</span>
        <span>Sirio</span>
      </Link>
      <nav aria-label="Panel del restaurante">
        <Link className={`nav-item ${active === 'profile' ? 'nav-item-active' : ''}`} href="/admin">
          <span aria-hidden="true">◇</span> Perfil
        </Link>
        <Link className={`nav-item ${active === 'menu' ? 'nav-item-active' : ''}`} href="/admin/menu">
          <span aria-hidden="true">≡</span> Carta
        </Link>
        <Link className={`nav-item ${active === 'qr' ? 'nav-item-active' : ''}`} href="/admin/qr">
          <span aria-hidden="true">⌗</span> QR
        </Link>
        <Link className={`nav-item ${active === 'statistics' ? 'nav-item-active' : ''}`} href="/admin/statistics">
          <span aria-hidden="true">◔</span> Estadísticas
        </Link>
      </nav>
      <button className="nav-item nav-button" onClick={logout} type="button">
        <span aria-hidden="true">↗</span> Cerrar sesión
      </button>
    </aside>
  );
}
