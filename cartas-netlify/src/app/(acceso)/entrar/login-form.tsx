'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { redirectTarget, sendJson } from '@/components/forms/send-json';
import { focusFirstError, useFormFields } from '@/components/forms/use-form-fields';
import { Button } from '@/components/ui/button';
import { controlClasses, Field } from '@/components/ui/field';
import { Notice } from '@/components/ui/surfaces';
import { validateLoginForm } from '@/shared/account-forms';

const FIELD_IDS = { email: 'login-email', password: 'login-password' } as const;

export function LoginForm() {
  const router = useRouter();
  const form = useFormFields({ email: '', password: '' }, validateLoginForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormError(null);
    if (focusFirstError(form.validateAll(), FIELD_IDS)) return;

    setPending(true);
    const result = await sendJson('/api/sesion', 'POST', form.values);
    if (result.ok) {
      router.replace(redirectTarget(result.data, '/'));
      return;
    }
    setPending(false);
    setFormError(result.error.message);
  }

  return (
    <form className="grid gap-4" noValidate onSubmit={handleSubmit}>
      <Field error={form.errors.email} id={FIELD_IDS.email} label="Correo">
        {(control) => (
          <input
            {...control}
            autoComplete="email"
            className={controlClasses}
            inputMode="email"
            name="email"
            onChange={(event) => form.setValue('email', event.target.value)}
            type="email"
            value={form.values.email}
          />
        )}
      </Field>
      <Field error={form.errors.password} id={FIELD_IDS.password} label="Contraseña">
        {(control) => (
          <input
            {...control}
            autoComplete="current-password"
            className={controlClasses}
            name="password"
            onChange={(event) => form.setValue('password', event.target.value)}
            type="password"
            value={form.values.password}
          />
        )}
      </Field>
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      <Button disabled={pending} fullWidth type="submit">
        {pending ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  );
}
