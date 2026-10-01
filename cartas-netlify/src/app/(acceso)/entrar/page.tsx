import type { Metadata } from 'next';
import Link from 'next/link';

import { Card } from '@/components/ui/surfaces';
import { redirectIfSignedIn } from '@/server/next/page-auth';

import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Entrar' };

export default async function SignInPage() {
  await redirectIfSignedIn();
  return (
    <Card className="grid gap-6 p-6 sm:p-8">
      <div className="grid gap-1.5">
        <h1 className="m-0 font-display text-3xl font-semibold tracking-tight">Entra a tu panel</h1>
        <p className="m-0 text-[15px] text-ink-soft">
          Administra la carta de tu restaurante desde cualquier dispositivo.
        </p>
      </div>
      <LoginForm />
      <div className="grid gap-3 border-t border-line pt-5 text-[15px]">
        <p className="m-0 text-ink-soft">
          ¿Aún no tienes cuenta?{' '}
          <Link className="font-semibold text-wine underline-offset-4 hover:underline" href="/registro">
            Crear cuenta
          </Link>
        </p>
        <p className="m-0 text-[13px] text-ink-muted">
          ¿Olvidaste tu contraseña? Contacta al administrador de la plataforma.
        </p>
      </div>
    </Card>
  );
}
