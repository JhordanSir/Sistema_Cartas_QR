import { redirect } from 'next/navigation';

import { hasSessionForRole } from '@/lib/api-server';

import { MenuDigitizer } from './menu-digitizer';

export default async function OwnerMenuPage() {
  if (!(await hasSessionForRole('OWNER'))) redirect('/admin/login');
  return <MenuDigitizer />;
}
