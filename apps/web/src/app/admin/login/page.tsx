import { LoginShell } from '@/components/login-shell';

import { SessionRedirect } from '../../session-access';

import { OwnerLoginForm } from './owner-login-form';

export default async function OwnerLoginPage() {
  return (
    <LoginShell
      footer={
        <p className="mt-6 text-center text-xs/relaxed text-ink-muted">
          ¿Olvidaste tu acceso? Escríbenos al{' '}
          <a className="font-bold text-olive" href="https://wa.me/51973502261">
            +51 973 502 261
          </a>
          .
        </p>
      }
      kicker="Panel del restaurante"
      lede="Completa la identidad de tu restaurante y prepara su presencia digital."
      owner
      title="Tu carta empieza aquí."
      titleId="owner-login-title"
    >
      <SessionRedirect destination="/admin" role="OWNER" />
      <OwnerLoginForm />
    </LoginShell>
  );
}
