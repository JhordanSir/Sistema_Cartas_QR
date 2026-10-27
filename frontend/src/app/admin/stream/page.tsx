import { redirect } from 'next/navigation';

import { hasSessionCookieForRole } from '@/lib/api-server';

import { SessionGate } from '../../session-access';

import { ProductStreamViewer } from './product-stream-viewer';

export default async function OwnerProductStreamPage() {
  if (!(await hasSessionCookieForRole('OWNER'))) redirect('/admin/login');
  return (
    <SessionGate redirectTo="/admin/login" role="OWNER">
      <ProductStreamViewer />
    </SessionGate>
  );
}
