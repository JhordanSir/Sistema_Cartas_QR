import { redirect } from 'next/navigation';

import { hasSessionCookieForRole } from '@/lib/api-server';

import { SessionGate } from '../session-access';

import { RestaurantBackoffice } from './restaurant-backoffice';

export default async function BackofficePage() {
  if (!(await hasSessionCookieForRole('ADMIN'))) {
    redirect('/login');
  }
  return (
    <SessionGate redirectTo="/login" role="ADMIN">
      <RestaurantBackoffice />
    </SessionGate>
  );
}
