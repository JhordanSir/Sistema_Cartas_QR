import { LoginShell } from '@/components/login-shell';

import { SessionRedirect } from '../session-access';

import { LoginForm } from './login-form';

export default async function LoginPage() {
  return (
    <LoginShell
      kicker="Acceso de plataforma"
      lede="Administra altas, disponibilidad y bajas definitivas de restaurantes."
      title="Tu mesa de control."
      titleId="login-title"
    >
      <SessionRedirect destination="/backoffice" role="ADMIN" />
      <LoginForm />
    </LoginShell>
  );
}
