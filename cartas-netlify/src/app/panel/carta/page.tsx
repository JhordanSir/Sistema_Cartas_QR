import type { Metadata } from 'next';

import { getMenuDraft } from '@/server/menu-draft';
import { requireOwnerPage } from '@/server/next/page-auth';

import { MenuEditor } from './menu-editor';

export const metadata: Metadata = { title: 'Carta' };

export default async function MenuPage() {
  const { restaurant } = await requireOwnerPage();
  const draft = await getMenuDraft(restaurant.id);
  return <MenuEditor initialDraft={draft} />;
}
