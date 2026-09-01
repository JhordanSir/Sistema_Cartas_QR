import { redirect } from 'next/navigation';

import { hasSessionCookieForRole } from '@/lib/api-server';

import { SessionGate } from '../../session-access';

import { QrManager } from './qr-manager';

export default async function OwnerQrPage() {
  if (!(await hasSessionCookieForRole('OWNER'))) redirect('/admin/login');
  return (
    <SessionGate redirectTo="/admin/login" role="OWNER">
      <QrManager />
    </SessionGate>
  );
}
