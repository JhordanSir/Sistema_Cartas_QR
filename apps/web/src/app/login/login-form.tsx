'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/button';
import { Field, FormError, fieldControl } from '@/components/field';

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/session/login', {
      body: JSON.stringify({
        email: form.get('email'),
        password: form.get('password'),
        role: 'ADMIN',
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
    if (!response.ok) {
      setError(
        response.status === 401
          ? 'El correo o la contraseña no son correctos.'
          : 'No pudimos iniciar sesión. Inténtalo nuevamente.',
      );
      setSubmitting(false);
      return;
    }
    router.replace('/backoffice');
    router.refresh();
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <Field label="Correo del administrador">
        <input
          autoComplete="email"
          className={fieldControl}
          inputMode="email"
          name="email"
          placeholder="admin@sirio.pe"
          required
          type="email"
        />
      </Field>
      <Field label="Contraseña">
        <input
          autoComplete="current-password"
          className={fieldControl}
          minLength={8}
          name="password"
          required
          type="password"
        />
      </Field>
      {error ? <FormError>{error}</FormError> : null}
      <Button disabled={submitting} full type="submit">
        {submitting ? 'Ingresando…' : 'Entrar al backoffice'}
      </Button>
    </form>
  );
}
