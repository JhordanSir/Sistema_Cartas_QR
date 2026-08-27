import { redirect } from 'next/navigation';

import { hasSessionForRole } from '@/lib/api-server';

import { RestaurantProfilePanel } from './restaurant-profile-panel';

export default async function OwnerAdminPage() {
  if (!(await hasSessionForRole('OWNER'))) redirect('/admin/login');
  return <RestaurantProfilePanel />;
}
