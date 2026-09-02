'use client';

import Image from 'next/image';
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
        <Image alt="" className="brand-mark-image" height={36} src="/brand/sirio-logo.webp" width={36} />
        <span>Sirio <b>Automatiza</b></span>
      </Link>
      <nav aria-label="Panel del restaurante">
        <Link aria-current={active === 'profile' ? 'page' : undefined} className={`nav-item ${active === 'profile' ? 'nav-item-active' : ''}`} href="/admin">
          <span aria-hidden="true">◇</span> Perfil
        </Link>
        <Link aria-current={active === 'menu' ? 'page' : undefined} className={`nav-item ${active === 'menu' ? 'nav-item-active' : ''}`} href="/admin/menu">
          <span aria-hidden="true">≡</span> Carta
        </Link>
        <Link aria-current={active === 'qr' ? 'page' : undefined} className={`nav-item ${active === 'qr' ? 'nav-item-active' : ''}`} href="/admin/qr">
          <span aria-hidden="true">⌗</span> QR
        </Link>
        <Link aria-current={active === 'statistics' ? 'page' : undefined} className={`nav-item ${active === 'statistics' ? 'nav-item-active' : ''}`} href="/admin/statistics">
          <span aria-hidden="true">◔</span> Estadísticas
        </Link>
      </nav>
      <button className="nav-item nav-button" onClick={logout} type="button">
        <span aria-hidden="true">↗</span> Cerrar sesión
      </button>
    </aside>
  );
}
