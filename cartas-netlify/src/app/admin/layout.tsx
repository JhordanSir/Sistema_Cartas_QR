import type { NavItem } from '@/components/app-header';
import { PanelFrame } from '@/components/panel-frame';
import { requireAdminPage } from '@/server/next/page-auth';

const ADMIN_NAVIGATION: readonly NavItem[] = [
  { href: '/admin', label: 'Restaurantes' },
  { href: '/admin/cuenta', label: 'Cuenta' },
];

export default async function BackofficeLayout({ children }: LayoutProps<'/admin'>) {
  await requireAdminPage({ allowPendingPasswordChange: true });
  return (
    <PanelFrame homeHref="/admin" items={ADMIN_NAVIGATION}>
      {children}
    </PanelFrame>
  );
}
