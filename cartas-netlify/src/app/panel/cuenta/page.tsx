import type { Metadata } from 'next';

import { AccountScreen } from '@/components/account-screen';
import { requireOwnerPage } from '@/server/next/page-auth';

export const metadata: Metadata = { title: 'Cuenta' };

export default async function OwnerAccountPage() {
  const { session } = await requireOwnerPage({ allowPendingPasswordChange: true });
  return (
    <AccountScreen
      email={session.account.email}
      mustChangePassword={session.account.mustChangePassword}
    />
  );
}
