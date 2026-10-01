import { eq, sql } from 'drizzle-orm';

import { getDb } from '../../db/index';
import { accounts, restaurants } from '../../db/schema';
import type { RegistrationMode } from '../shared/account-forms';
import { resolveUniqueSlug } from '../shared/slug';
import { isUniqueViolation } from './db-errors';
import { ApiError } from './http';
import { revokeOtherSessions, startSession, type IssuedSession, type SessionAccount } from './session';

/** Key of the transaction-level advisory lock that serializes every registration (§E4). */
const REGISTRATION_LOCK_KEY = 72_410_001;

export const EMAIL_TAKEN_MESSAGE = 'Ya existe una cuenta con ese correo.';

function emailTakenError(): ApiError {
  return new ApiError(409, 'EMAIL_TAKEN', EMAIL_TAKEN_MESSAGE, { email: EMAIL_TAKEN_MESSAGE });
}

export async function hasAnyAccount(): Promise<boolean> {
  const [row] = await getDb().select({ id: accounts.id }).from(accounts).limit(1);
  return Boolean(row);
}

export type RegistrationInput = {
  mode: RegistrationMode;
  /** Already normalized (lowercase, trimmed). */
  email: string;
  passwordHash: string;
  /** Already collapsed; ignored for the administrator. */
  restaurantName: string;
};

export type RegistrationResult = IssuedSession & { account: SessionAccount };

/**
 * The first account is the administrator, without a restaurant; every later
 * one is an owner with its restaurant. The advisory lock makes the "is this the
 * first account?" check and the inserts atomic across concurrent registrations.
 */
export async function registerAccount(input: RegistrationInput): Promise<RegistrationResult> {
  try {
    return await getDb().transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(${REGISTRATION_LOCK_KEY})`);

      const [anyAccount] = await tx.select({ id: accounts.id }).from(accounts).limit(1);
      const role = anyAccount ? 'OWNER' : 'ADMIN';
      if (input.mode === 'admin' && role === 'OWNER') {
        throw new ApiError(
          409,
          'ADMIN_ALREADY_EXISTS',
          'La cuenta de administrador ya existe. Recarga la página para registrar tu restaurante.',
        );
      }
      if (input.mode === 'owner' && role === 'ADMIN') {
        throw new ApiError(
          409,
          'ADMIN_REQUIRED',
          'Primero hay que crear la cuenta de administrador. Recarga la página.',
        );
      }

      const [sameEmail] = await tx
        .select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.email, input.email))
        .limit(1);
      if (sameEmail) throw emailTakenError();

      const [account] = await tx
        .insert(accounts)
        .values({ email: input.email, passwordHash: input.passwordHash, role })
        .returning({ id: accounts.id });
      if (!account) throw new Error('The account insert returned no row.');

      if (role === 'OWNER') {
        const slug = await resolveUniqueSlug(input.restaurantName, async (candidate) => {
          const [taken] = await tx
            .select({ id: restaurants.id })
            .from(restaurants)
            .where(eq(restaurants.slug, candidate))
            .limit(1);
          return Boolean(taken);
        });
        await tx.insert(restaurants).values({
          name: input.restaurantName,
          ownerAccountId: account.id,
          slug,
        });
      }

      const session = await startSession(account.id, tx);
      return {
        ...session,
        account: { email: input.email, id: account.id, mustChangePassword: false, role },
      };
    });
  } catch (error) {
    if (isUniqueViolation(error, 'accounts_email_key')) throw emailTakenError();
    throw error;
  }
}

export type LoginAccount = SessionAccount & { passwordHash: string; isActive: boolean };

export async function findAccountByEmail(email: string): Promise<LoginAccount | null> {
  const [row] = await getDb()
    .select({
      email: accounts.email,
      id: accounts.id,
      isActive: accounts.isActive,
      mustChangePassword: accounts.mustChangePassword,
      passwordHash: accounts.passwordHash,
      role: accounts.role,
    })
    .from(accounts)
    .where(eq(accounts.email, email))
    .limit(1);
  return row ?? null;
}

export async function getPasswordHash(accountId: string): Promise<string | null> {
  const [row] = await getDb()
    .select({ passwordHash: accounts.passwordHash })
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);
  return row?.passwordHash ?? null;
}

/** Saves the new hash, clears must_change_password and signs out every other session (§E4). */
export async function replacePassword(
  accountId: string,
  passwordHash: string,
  keepSessionId: string,
): Promise<void> {
  await getDb().transaction(async (tx) => {
    await tx
      .update(accounts)
      .set({ mustChangePassword: false, passwordHash })
      .where(eq(accounts.id, accountId));
    await revokeOtherSessions(accountId, keepSessionId, tx);
  });
}
