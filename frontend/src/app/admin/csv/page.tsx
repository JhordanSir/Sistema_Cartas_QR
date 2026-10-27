import { redirect } from 'next/navigation';

import { hasSessionCookieForRole } from '@/lib/api-server';

import { SessionGate } from '../../session-access';

import { CsvViewer } from './csv-viewer';

export default async function OwnerCsvPage() {
  if (!(await hasSessionCookieForRole('OWNER'))) redirect('/admin/login');
  return (
    <SessionGate redirectTo="/admin/login" role="OWNER">
      <CsvViewer />
    </SessionGate>
  );
}
