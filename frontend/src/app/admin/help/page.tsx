import { redirect } from 'next/navigation';

import { hasSessionCookieForRole } from '@/lib/api-server';

import { SessionGate } from '../../session-access';

import { OwnerHelpLibrary } from './owner-help-library';

export default async function OwnerHelpPage() {
  if (!(await hasSessionCookieForRole('OWNER'))) redirect('/admin/login');
  return (
    <SessionGate redirectTo="/admin/login" role="OWNER">
      <OwnerHelpLibrary />
    </SessionGate>
  );
}

