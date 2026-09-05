'use client';

import { useRouter } from 'next/navigation';

import { NavItem, SideRail } from '@/components/side-rail';

const DESTINATIONS = [
  { href: '/admin', icon: '◇', key: 'profile', label: 'Perfil' },
  { href: '/admin/menu', icon: '≡', key: 'menu', label: 'Carta' },
  { href: '/admin/qr', icon: '⌗', key: 'qr', label: 'QR' },
  { href: '/admin/statistics', icon: '◔', key: 'statistics', label: 'Estadísticas' },
  { href: '/admin/help', icon: '?', key: 'help', label: 'Ayuda' },
] as const;

export function OwnerNavigation({
  active,
}: {
  active: 'help' | 'menu' | 'profile' | 'qr' | 'statistics';
}) {
  const router = useRouter();

  async function logout() {
    await fetch('/api/session/logout', { method: 'POST' });
    router.replace('/admin/login');
    router.refresh();
  }

  return (
    <SideRail label="Panel del restaurante" onLogout={() => void logout()}>
      {DESTINATIONS.map((destination) => (
        <NavItem
          active={active === destination.key}
          href={destination.href}
          icon={destination.icon}
          key={destination.key}
        >
          {destination.label}
        </NavItem>
      ))}
    </SideRail>
  );
}
