import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { hasSessionCookieForRole } from '@/lib/api-server';
import { RestaurantStatisticsDashboard } from '@/app/statistics/restaurant-statistics-dashboard';

import { SessionGate } from '../../session-access';

export default async function OwnerStatisticsPage() {
  if (!(await hasSessionCookieForRole('OWNER'))) redirect('/admin/login');
  return (
    <SessionGate redirectTo="/admin/login" role="OWNER">
      <Suspense fallback={null}>
        <RestaurantStatisticsDashboard scope="owner" />
      </Suspense>
    </SessionGate>
  );
}
