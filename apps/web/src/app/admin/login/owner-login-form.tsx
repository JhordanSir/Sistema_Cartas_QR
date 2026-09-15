'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useId, useState } from 'react';

import { Button } from '@/components/button';
import { Field, FormError, fieldControl } from '@/components/field';
import { PasswordField } from '@/components/password-field';
import { useCredentialsValidation } from '@/lib/use-credentials-validation';

export function OwnerLoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const validation = useCredentialsValidation();
  const emailErrorId = useId();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');
    if (!validation.approveSubmission(email, password)) return;

    setSubmitting(true);
    setError(null);
    const response = await fetch('/api/session/login', {
      body: JSON.stringify({ email, password, role: 'OWNER' }),
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
    router.replace('/admin');
    router.refresh();
  }

  // noValidate: the regex checks are the single source of truth, so the browser's
  // own email bubble never pre-empts the message they show.
  return (
    <form className="grid gap-5" noValidate onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <Field label="Correo del propietario">
          <input
            aria-describedby={validation.emailError ? emailErrorId : undefined}
            aria-invalid={validation.emailError ? true : undefined}
            autoComplete="email"
            className={fieldControl}
            inputMode="email"
            name="email"
            onBlur={validation.onEmailBlur}
            onChange={(event) => validation.onEmailChange(event.currentTarget.value)}
            placeholder="hola@turestaurante.pe"
            required
            type="email"
          />
        </Field>
        {validation.emailError ? (
          <FormError id={emailErrorId}>{validation.emailError}</FormError>
        ) : null}
      </div>
      <PasswordField
        autoComplete="current-password"
        error={validation.passwordError}
        hint={validation.passwordHint}
        name="password"
        onBlur={validation.onPasswordBlur}
        onChange={(event) => validation.onPasswordChange(event.currentTarget.value)}
        required
      />
      {error ? <FormError>{error}</FormError> : null}
      <Button disabled={submitting} full type="submit">
        {submitting ? 'Ingresando…' : 'Entrar a mi restaurante'}
      </Button>
    </form>
  );
}
