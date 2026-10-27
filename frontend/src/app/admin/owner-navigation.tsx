'use client';

import { useRouter } from 'next/navigation';

import { NavItem, SideRail } from '@/components/side-rail';
import { useCopy } from '@/i18n/locale-provider';
import { ownerPanelCopy } from '@/i18n/messages/owner-panel';

const DESTINATIONS = [
  { href: '/admin', icon: '◇', key: 'profile' },
  { href: '/admin/menu', icon: '≡', key: 'menu' },
  { href: '/admin/qr', icon: '⌗', key: 'qr' },
  { href: '/admin/statistics', icon: '◔', key: 'statistics' },
  { href: '/admin/help', icon: '?', key: 'help' },
] as const;

export function OwnerNavigation({
  active,
}: {
  active: 'help' | 'menu' | 'profile' | 'qr' | 'statistics';
}) {
  const router = useRouter();
  const copy = useCopy(ownerPanelCopy).navigation;

  async function logout() {
    await fetch('/api/session/logout', { method: 'POST' });
    router.replace('/admin/login');
    router.refresh();
  }

  return (
    <SideRail label={copy.label} onLogout={() => void logout()}>
      {DESTINATIONS.map((destination) => (
        <NavItem
          active={active === destination.key}
          href={destination.href}
          icon={destination.icon}
          key={destination.key}
        >
          {copy[destination.key]}
        </NavItem>
      ))}
    </SideRail>
  );
}
