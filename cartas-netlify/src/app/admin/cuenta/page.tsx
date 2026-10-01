import type { Metadata } from 'next';

import { AccountScreen } from '@/components/account-screen';
import { requireAdminPage } from '@/server/next/page-auth';

export const metadata: Metadata = { title: 'Cuenta' };

export default async function AdminAccountPage() {
  const session = await requireAdminPage({ allowPendingPasswordChange: true });
  return (
    <AccountScreen
      email={session.account.email}
      mustChangePassword={session.account.mustChangePassword}
    />
  );
}
