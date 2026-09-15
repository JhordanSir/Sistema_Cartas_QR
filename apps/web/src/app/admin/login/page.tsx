import { LoginShell } from '@/components/login-shell';
import { loginCopy } from '@/i18n/messages/login';
import { getCopy } from '@/i18n/server';

import { SessionRedirect } from '../../session-access';

import { OwnerLoginForm } from './owner-login-form';

export default async function OwnerLoginPage() {
  const copy = (await getCopy(loginCopy)).owner;
  return (
    <LoginShell
      footer={
        <p className="mt-6 text-center text-xs/relaxed text-ink-muted">
          {copy.forgotAccess}{' '}
          <a className="font-bold text-olive" href="https://wa.me/51973502261">
            +51 973 502 261
          </a>
          .
        </p>
      }
      kicker={copy.kicker}
      lede={copy.lede}
      owner
      title={copy.title}
      titleId="owner-login-title"
    >
      <SessionRedirect destination="/admin" role="OWNER" />
      <OwnerLoginForm />
    </LoginShell>
  );
}
