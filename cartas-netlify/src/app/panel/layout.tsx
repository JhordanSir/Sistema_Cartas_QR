import type { NavItem } from '@/components/app-header';
import { PanelFrame } from '@/components/panel-frame';
import { Notice } from '@/components/ui/surfaces';
import { requireOwnerPage } from '@/server/next/page-auth';
import { PAUSED_RESTAURANT_NOTICE } from '@/shared/backoffice';

// §E13 order: Perfil · Carta · QR · Estadísticas · Cuenta · Salir.
const OWNER_NAVIGATION: readonly NavItem[] = [
  { href: '/panel', label: 'Perfil' },
  { href: '/panel/carta', label: 'Carta' },
  { href: '/panel/qr', label: 'QR' },
  { href: '/panel/estadisticas', label: 'Estadísticas' },
  { href: '/panel/cuenta', label: 'Cuenta' },
];

export default async function OwnerPanelLayout({ children }: LayoutProps<'/panel'>) {
  const { restaurant } = await requireOwnerPage({ allowPendingPasswordChange: true });
  // An owner whose menu is paused can still sign in and edit it (§E4).
  const notice =
    restaurant.status === 'DISABLED' ? <Notice tone="warning">{PAUSED_RESTAURANT_NOTICE}</Notice> : null;
  return (
    <PanelFrame homeHref="/panel" items={OWNER_NAVIGATION} notice={notice}>
      {children}
    </PanelFrame>
  );
}
