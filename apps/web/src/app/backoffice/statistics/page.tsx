import { redirect } from 'next/navigation';

import { hasSessionCookieForRole } from '@/lib/api-server';
import { RestaurantStatisticsDashboard } from '@/app/statistics/restaurant-statistics-dashboard';

import { SessionGate } from '../../session-access';

export default async function BackofficeStatisticsPage() {
  if (!(await hasSessionCookieForRole('ADMIN'))) redirect('/login');
  return (
    <SessionGate redirectTo="/login" role="ADMIN">
      <RestaurantStatisticsDashboard scope="backoffice" />
    </SessionGate>
  );
}
