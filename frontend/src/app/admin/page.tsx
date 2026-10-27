import { redirect } from 'next/navigation';

import { hasSessionCookieForRole } from '@/lib/api-server';

import { SessionGate } from '../session-access';

import { RestaurantProfilePanel } from './restaurant-profile-panel';

export default async function OwnerAdminPage() {
  if (!(await hasSessionCookieForRole('OWNER'))) redirect('/admin/login');
  return (
    <SessionGate redirectTo="/admin/login" role="OWNER">
      <RestaurantProfilePanel />
    </SessionGate>
  );
}
