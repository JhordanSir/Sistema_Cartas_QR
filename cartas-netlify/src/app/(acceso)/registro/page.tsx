import type { Metadata } from 'next';
import Link from 'next/link';

import { Card } from '@/components/ui/surfaces';

import { RegisterForm } from './register-form';

export const metadata: Metadata = { title: 'Crear cuenta' };

export default function SignUpPage() {
  return (
    <Card className="grid gap-6 p-6 sm:p-8">
      <div className="grid gap-1.5">
        <h1 className="m-0 font-display text-3xl font-semibold tracking-tight">
          Crea la carta digital de tu restaurante
        </h1>
        <p className="m-0 text-[15px] text-ink-soft">
          Tu carta tendrá una dirección propia y un QR que no cambia aunque edites los platos.
        </p>
      </div>
      <RegisterForm />
      <p className="m-0 border-t border-line pt-5 text-[15px] text-ink-soft">
        ¿Ya tienes cuenta?{' '}
        <Link className="font-semibold text-wine underline-offset-4 hover:underline" href="/entrar">
          Entra
        </Link>
      </p>
    </Card>
  );
}
