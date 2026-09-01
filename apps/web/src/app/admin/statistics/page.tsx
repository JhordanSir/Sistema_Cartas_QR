import { redirect } from 'next/navigation';

import { hasSessionCookieForRole } from '@/lib/api-server';
import { RestaurantStatisticsDashboard } from '@/app/statistics/restaurant-statistics-dashboard';

import { SessionGate } from '../../session-access';

export default async function OwnerStatisticsPage() {
  if (!(await hasSessionCookieForRole('OWNER'))) redirect('/admin/login');
  return (
    <SessionGate redirectTo="/admin/login" role="OWNER">
      <RestaurantStatisticsDashboard scope="owner" />
    </SessionGate>
  );
}
