import { z } from 'zod';

import { getPasswordHash, replacePassword } from '@/server/accounts';
import { ApiError, handleApi, jsonResponse, readJsonBody, validationError } from '@/server/http';
import { authenticate } from '@/server/next/route-auth';
import { assertSameOrigin } from '@/server/origin';
import { hashPassword, verifyPassword } from '@/server/password';
import { hasErrors, validatePasswordChangeForm } from '@/shared/account-forms';
import { homePathFor } from '@/shared/routes';

const PasswordChangeBody = z.object({
  currentPassword: z.string().max(1000),
  newPassword: z.string().max(1000),
  newPasswordConfirmation: z.string().max(1000),
});

const WRONG_CURRENT_PASSWORD = 'La contraseña actual no es correcta.';

/** Changes the own password and signs out every other session (§E4). */
export function POST(request: Request): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request);
    const session = await authenticate(request, { allowPendingPasswordChange: true });
    const body = await readJsonBody(request, PasswordChangeBody);

    const errors = validatePasswordChangeForm(body);
    if (hasErrors(errors)) throw validationError(errors);

    const currentHash = await getPasswordHash(session.account.id);
    if (!currentHash || !(await verifyPassword(body.currentPassword, currentHash))) {
      throw new ApiError(400, 'WRONG_CURRENT_PASSWORD', WRONG_CURRENT_PASSWORD, {
        currentPassword: WRONG_CURRENT_PASSWORD,
      });
    }

    await replacePassword(session.account.id, await hashPassword(body.newPassword), session.id);
    return jsonResponse({
      redirectTo: homePathFor({ ...session.account, mustChangePassword: false }),
    });
  });
}
