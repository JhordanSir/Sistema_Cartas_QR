'use client';

import { useRouter } from 'next/navigation';

import { NavItem, SideRail } from '@/components/side-rail';

export function BackofficeNavigation({ active }: { active: 'restaurants' | 'statistics' }) {
  const router = useRouter();

  async function logout() {
    await fetch('/api/session/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <SideRail label="Backoffice" onLogout={() => void logout()}>
      <NavItem active={active === 'restaurants'} href="/backoffice" icon="▦">
        Restaurantes
      </NavItem>
      <NavItem active={active === 'statistics'} href="/backoffice/statistics" icon="◔">
        Estadísticas
      </NavItem>
    </SideRail>
  );
}
