import type { Metadata } from 'next';

import { getActiveJob } from '@/server/digitization/jobs';
import { getMenuDraft } from '@/server/menu-draft';
import { requireOwnerPage } from '@/server/next/page-auth';

import { MenuEditor } from './menu-editor';

export const metadata: Metadata = { title: 'Carta' };

export default async function MenuPage() {
  const { restaurant } = await requireOwnerPage();
  // The active job first: reading it expires an abandoned one, which unlocks the draft.
  const initialJob = await getActiveJob(restaurant.id);
  const draft = await getMenuDraft(restaurant.id);
  return <MenuEditor initialDraft={draft} initialJob={initialJob} restaurantName={restaurant.name} />;
}
