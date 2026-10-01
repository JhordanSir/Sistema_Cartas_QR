import type { NavItem } from '@/components/app-header';
import { PanelFrame } from '@/components/panel-frame';
import { requireOwnerPage } from '@/server/next/page-auth';

// §E13 order: Perfil · Carta · QR · Estadísticas · Cuenta · Salir. Each section
// joins the list in the phase that builds it.
const OWNER_NAVIGATION: readonly NavItem[] = [
  { href: '/panel', label: 'Perfil' },
  { href: '/panel/carta', label: 'Carta' },
  { href: '/panel/qr', label: 'QR' },
  { href: '/panel/cuenta', label: 'Cuenta' },
];

export default async function OwnerPanelLayout({ children }: LayoutProps<'/panel'>) {
  await requireOwnerPage({ allowPendingPasswordChange: true });
  return (
    <PanelFrame homeHref="/panel" items={OWNER_NAVIGATION}>
      {children}
    </PanelFrame>
  );
}
