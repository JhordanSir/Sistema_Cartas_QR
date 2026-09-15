'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useId, useState } from 'react';

import { Button } from '@/components/button';
import { Field, FormError, fieldControl } from '@/components/field';
import { PasswordField } from '@/components/password-field';
import { useCopy } from '@/i18n/locale-provider';
import { loginCopy } from '@/i18n/messages/login';
import { useCredentialsValidation } from '@/lib/use-credentials-validation';

type LoginFailure = 'invalidCredentials' | 'serviceUnavailable';

export function OwnerLoginForm() {
  const router = useRouter();
  const copy = useCopy(loginCopy);
  const [failure, setFailure] = useState<LoginFailure | null>(null);
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
    setFailure(null);
    const response = await fetch('/api/session/login', {
      body: JSON.stringify({ email, password, role: 'OWNER' }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
    if (!response.ok) {
      // 400 is the API refusing the shape itself (a password under 8 characters, an
      // email it does not accept): no account can match those credentials either.
      const wrongCredentials = response.status === 400 || response.status === 401;
      setFailure(wrongCredentials ? 'invalidCredentials' : 'serviceUnavailable');
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
        <Field label={copy.owner.emailLabel}>
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
          <FormError id={emailErrorId}>{copy.feedback[validation.emailError]}</FormError>
        ) : null}
      </div>
      <PasswordField
        autoComplete="current-password"
        error={validation.passwordError ? copy.feedback[validation.passwordError] : null}
        hint={validation.passwordHint ? copy.feedback[validation.passwordHint] : null}
        name="password"
        onBlur={validation.onPasswordBlur}
        onChange={(event) => validation.onPasswordChange(event.currentTarget.value)}
        required
      />
      {failure ? <FormError>{copy[failure]}</FormError> : null}
      <Button disabled={submitting} full type="submit">
        {submitting ? copy.submitting : copy.owner.submit}
      </Button>
    </form>
  );
}
