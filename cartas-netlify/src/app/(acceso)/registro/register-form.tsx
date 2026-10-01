'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { redirectTarget, sendJson } from '@/components/forms/send-json';
import { focusFirstError, useFormFields } from '@/components/forms/use-form-fields';
import { Button } from '@/components/ui/button';
import { controlClasses, Field } from '@/components/ui/field';
import { Notice } from '@/components/ui/surfaces';
import { validateRegistrationForm, type RegistrationMode } from '@/shared/account-forms';
import { RESTAURANT_NAME_MAX_LENGTH } from '@/shared/validation';

const FIELD_IDS = {
  restaurantName: 'register-restaurant',
  email: 'register-email',
  password: 'register-password',
  passwordConfirmation: 'register-password-confirmation',
} as const;

const PASSWORD_HINT = 'Entre 8 y 128 caracteres, con una mayúscula, una minúscula y un número.';

/** `admin` only exists while there is no account yet; afterwards every sign-up is an owner. */
export function RegisterForm({ mode }: { mode: RegistrationMode }) {
  const router = useRouter();
  const form = useFormFields(
    { restaurantName: '', email: '', password: '', passwordConfirmation: '' },
    (values) => validateRegistrationForm(values, mode),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormError(null);
    if (focusFirstError(form.validateAll(), FIELD_IDS)) return;

    setPending(true);
    const result = await sendJson('/api/registro', 'POST', { ...form.values, mode });
    if (result.ok) {
      router.replace(redirectTarget(result.data, '/'));
      return;
    }
    setPending(false);
    if (result.error.fields) {
      form.setServerErrors(result.error.fields);
      focusFirstError(result.error.fields, FIELD_IDS);
    } else {
      setFormError(result.error.message);
    }
  }

  return (
    <form className="grid gap-4" noValidate onSubmit={handleSubmit}>
      {mode === 'owner' ? (
        <Field error={form.errors.restaurantName} id={FIELD_IDS.restaurantName} label="Nombre del restaurante">
          {(control) => (
            <input
              {...control}
              autoComplete="organization"
              className={controlClasses}
              maxLength={RESTAURANT_NAME_MAX_LENGTH}
              name="restaurantName"
              onChange={(event) => form.setValue('restaurantName', event.target.value)}
              value={form.values.restaurantName}
            />
          )}
        </Field>
      ) : null}
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
      <Field error={form.errors.password} hint={PASSWORD_HINT} id={FIELD_IDS.password} label="Contraseña">
        {(control) => (
          <input
            {...control}
            autoComplete="new-password"
            className={controlClasses}
            name="password"
            onChange={(event) => form.setValue('password', event.target.value)}
            type="password"
            value={form.values.password}
          />
        )}
      </Field>
      <Field
        error={form.errors.passwordConfirmation}
        id={FIELD_IDS.passwordConfirmation}
        label="Repite la contraseña"
      >
        {(control) => (
          <input
            {...control}
            autoComplete="new-password"
            className={controlClasses}
            name="passwordConfirmation"
            onChange={(event) => form.setValue('passwordConfirmation', event.target.value)}
            type="password"
            value={form.values.passwordConfirmation}
          />
        )}
      </Field>
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      <Button disabled={pending} fullWidth type="submit">
        {pending ? 'Creando cuenta…' : 'Crear cuenta'}
      </Button>
    </form>
  );
}
