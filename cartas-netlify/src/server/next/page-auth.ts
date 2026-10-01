import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { homePathFor } from '../../shared/routes';
import { findRestaurantByOwner, type OwnerRestaurant } from '../restaurants';
import { readSession, type ActiveSession } from '../session';

// Authorization for pages and layouts. Layouts do not re-render on client
// navigation, so every page checks again; `cache` keeps it to one query per request.

export const getCurrentSession = cache(async (): Promise<ActiveSession | null> => {
  return readSession((await headers()).get('cookie'));
});

const getOwnerRestaurant = cache(findRestaurantByOwner);

type PageAuthOptions = {
  /** Only the account page stays reachable while a password change is pending. */
  allowPendingPasswordChange?: boolean;
};

export async function requireOwnerPage(
  options: PageAuthOptions = {},
): Promise<{ session: ActiveSession; restaurant: OwnerRestaurant }> {
  const session = await getCurrentSession();
  if (!session || session.account.role !== 'OWNER') redirect('/entrar');
  if (session.account.mustChangePassword && !options.allowPendingPasswordChange) {
    redirect('/panel/cuenta');
  }
  const restaurant = await getOwnerRestaurant(session.account.id);
  if (!restaurant) throw new Error(`Owner account ${session.account.id} has no restaurant.`);
  return { restaurant, session };
}

export async function requireAdminPage(options: PageAuthOptions = {}): Promise<ActiveSession> {
  const session = await getCurrentSession();
  if (!session || session.account.role !== 'ADMIN') redirect('/entrar');
  if (session.account.mustChangePassword && !options.allowPendingPasswordChange) {
    redirect('/admin/cuenta');
  }
  return session;
}

/** The access screens are for signed-out visitors only. */
export async function redirectIfSignedIn(): Promise<void> {
  const session = await getCurrentSession();
  if (session) redirect(homePathFor(session.account));
}
