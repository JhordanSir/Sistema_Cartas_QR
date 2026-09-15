'use client';

import { useRouter } from 'next/navigation';

import { NavItem, SideRail } from '@/components/side-rail';
import { useCopy } from '@/i18n/locale-provider';
import { backofficeCopy } from '@/i18n/messages/backoffice';

export function BackofficeNavigation({ active }: { active: 'restaurants' | 'statistics' }) {
  const router = useRouter();
  const copy = useCopy(backofficeCopy).navigation;

  async function logout() {
    await fetch('/api/session/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <SideRail label={copy.label} onLogout={() => void logout()}>
      <NavItem active={active === 'restaurants'} href="/backoffice" icon="▦">
        {copy.restaurants}
      </NavItem>
      <NavItem active={active === 'statistics'} href="/backoffice/statistics" icon="◔">
        {copy.statistics}
      </NavItem>
    </SideRail>
  );
}
