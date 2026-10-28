import { redirect } from 'next/navigation';

import { hasSessionCookieForRole } from '@/lib/api-server';

import { SessionGate } from '../../session-access';

import { CountriesExplorer } from './countries-explorer';

export default async function OwnerCountriesPage() {
  if (!(await hasSessionCookieForRole('OWNER'))) redirect('/admin/login');
  return (
    <SessionGate redirectTo="/admin/login" role="OWNER">
      <CountriesExplorer />
    </SessionGate>
  );
}
