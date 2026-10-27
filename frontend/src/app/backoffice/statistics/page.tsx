import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { hasSessionCookieForRole } from '@/lib/api-server';
import { RestaurantStatisticsDashboard } from '@/app/statistics/restaurant-statistics-dashboard';

import { SessionGate } from '../../session-access';

export default async function BackofficeStatisticsPage() {
  if (!(await hasSessionCookieForRole('ADMIN'))) redirect('/login');
  return (
    <SessionGate redirectTo="/login" role="ADMIN">
      <Suspense fallback={null}>
        <RestaurantStatisticsDashboard scope="backoffice" />
      </Suspense>
    </SessionGate>
  );
}
