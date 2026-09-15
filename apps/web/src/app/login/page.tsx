import { LoginShell } from '@/components/login-shell';
import { loginCopy } from '@/i18n/messages/login';
import { getCopy } from '@/i18n/server';

import { SessionRedirect } from '../session-access';

import { LoginForm } from './login-form';

export default async function LoginPage() {
  const copy = (await getCopy(loginCopy)).admin;
  return (
    <LoginShell kicker={copy.kicker} lede={copy.lede} title={copy.title} titleId="login-title">
      <SessionRedirect destination="/backoffice" role="ADMIN" />
      <LoginForm />
    </LoginShell>
  );
}
