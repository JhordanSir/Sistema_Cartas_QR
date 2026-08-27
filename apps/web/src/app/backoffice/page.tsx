import { redirect } from 'next/navigation';

import { hasSessionForRole } from '@/lib/api-server';

import { RestaurantBackoffice } from './restaurant-backoffice';

export default async function BackofficePage() {
  if (!(await hasSessionForRole('ADMIN'))) {
    redirect('/login');
  }
  return <RestaurantBackoffice />;
}
