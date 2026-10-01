import { redirect } from 'next/navigation';

import { getCurrentSession } from '@/server/next/page-auth';
import { homePathFor } from '@/shared/routes';

/** No landing page: `/` sends each visitor to the screen that fits their session (§E1). */
export default async function HomePage() {
  const session = await getCurrentSession();
  redirect(session ? homePathFor(session.account) : '/entrar');
}
