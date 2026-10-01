'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { redirectTarget, sendJson } from '@/components/forms/send-json';
import { focusFirstError, useFormFields } from '@/components/forms/use-form-fields';
import { Button } from '@/components/ui/button';
import { controlClasses, Field } from '@/components/ui/field';
import { Notice } from '@/components/ui/surfaces';
import { validatePasswordChangeForm } from '@/shared/account-forms';

const FIELD_IDS = {
  currentPassword: 'account-current-password',
  newPassword: 'account-new-password',
  newPasswordConfirmation: 'account-new-password-confirmation',
} as const;

const PASSWORD_HINT = 'Entre 8 y 128 caracteres, con una mayúscula, una minúscula y un número.';

/** When the change was mandatory, a successful save leads to the panel. */
export function PasswordChangeForm({ mustChangePassword }: { mustChangePassword: boolean }) {
  const router = useRouter();
  const form = useFormFields(
    { currentPassword: '', newPassword: '', newPasswordConfirmation: '' },
    validatePasswordChangeForm,
  );
  const [feedback, setFeedback] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFeedback(null);
    if (focusFirstError(form.validateAll(), FIELD_IDS)) return;

    setPending(true);
    const result = await sendJson('/api/cuenta/contrasena', 'POST', form.values);
    if (result.ok) {
      if (mustChangePassword) {
        router.replace(redirectTarget(result.data, '/'));
        router.refresh();
        return;
      }
      setPending(false);
      form.reset();
      setFeedback({ text: 'Contraseña actualizada. Cerramos tus otras sesiones.', tone: 'success' });
      return;
    }
    setPending(false);
    if (result.error.fields) {
      form.setServerErrors(result.error.fields);
      focusFirstError(result.error.fields, FIELD_IDS);
    } else {
      setFeedback({ text: result.error.message, tone: 'error' });
    }
  }

  return (
    <form className="grid gap-4" noValidate onSubmit={handleSubmit}>
      <Field error={form.errors.currentPassword} id={FIELD_IDS.currentPassword} label="Contraseña actual">
        {(control) => (
          <input
            {...control}
            autoComplete="current-password"
            className={controlClasses}
            name="currentPassword"
            onChange={(event) => form.setValue('currentPassword', event.target.value)}
            type="password"
            value={form.values.currentPassword}
          />
        )}
      </Field>
      <Field
        error={form.errors.newPassword}
        hint={PASSWORD_HINT}
        id={FIELD_IDS.newPassword}
        label="Nueva contraseña"
      >
        {(control) => (
          <input
            {...control}
            autoComplete="new-password"
            className={controlClasses}
            name="newPassword"
            onChange={(event) => form.setValue('newPassword', event.target.value)}
            type="password"
            value={form.values.newPassword}
          />
        )}
      </Field>
      <Field
        error={form.errors.newPasswordConfirmation}
        id={FIELD_IDS.newPasswordConfirmation}
        label="Repite la nueva contraseña"
      >
        {(control) => (
          <input
            {...control}
            autoComplete="new-password"
            className={controlClasses}
            name="newPasswordConfirmation"
            onChange={(event) => form.setValue('newPasswordConfirmation', event.target.value)}
            type="password"
            value={form.values.newPasswordConfirmation}
          />
        )}
      </Field>
      {feedback ? <Notice tone={feedback.tone}>{feedback.text}</Notice> : null}
      <Button className="justify-self-start" disabled={pending} type="submit">
        {pending ? 'Guardando…' : 'Cambiar contraseña'}
      </Button>
    </form>
  );
}
