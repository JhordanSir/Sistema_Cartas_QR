import { redirect } from 'next/navigation';

import { hasSessionCookieForRole } from '@/lib/api-server';

import { SessionGate } from '../../session-access';

import { MenuDigitizer } from './menu-digitizer';

export default async function OwnerMenuPage() {
  if (!(await hasSessionCookieForRole('OWNER'))) redirect('/admin/login');
  return (
    <SessionGate redirectTo="/admin/login" role="OWNER">
      <MenuDigitizer />
    </SessionGate>
  );
}
