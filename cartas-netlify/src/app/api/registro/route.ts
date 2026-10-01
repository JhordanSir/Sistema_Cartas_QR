import { z } from 'zod';

import { registerAccount } from '@/server/accounts';
import { handleApi, jsonResponse, readJsonBody, validationError } from '@/server/http';
import { setSessionCookie } from '@/server/next/route-auth';
import { assertSameOrigin } from '@/server/origin';
import { hashPassword } from '@/server/password';
import { hasErrors, validateRegistrationForm } from '@/shared/account-forms';
import { homePathFor } from '@/shared/routes';
import { collapseWhitespace, normalizeEmail } from '@/shared/validation';

const RegistrationBody = z.object({
  email: z.string().max(1000),
  mode: z.enum(['admin', 'owner']),
  password: z.string().max(1000),
  passwordConfirmation: z.string().max(1000),
  restaurantName: z.string().max(1000).default(''),
});

/** First account → administrator; afterwards → owner with their restaurant (§E4). */
export function POST(request: Request): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request);
    const body = await readJsonBody(request, RegistrationBody);

    const errors = validateRegistrationForm(body, body.mode);
    if (hasErrors(errors)) throw validationError(errors);

    const result = await registerAccount({
      email: normalizeEmail(body.email),
      mode: body.mode,
      passwordHash: await hashPassword(body.password),
      restaurantName: collapseWhitespace(body.restaurantName),
    });
    await setSessionCookie(result.token, result.expiresAt);
    return jsonResponse({ redirectTo: homePathFor(result.account) }, 201);
  });
}
