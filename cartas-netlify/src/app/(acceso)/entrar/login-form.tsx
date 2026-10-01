'use client';

import { Button } from '@/components/ui/button';
import { controlClasses, Field } from '@/components/ui/field';

// Layout only for now: signing in is wired up in phase 3.
export function LoginForm() {
  return (
    <form className="grid gap-4" noValidate onSubmit={(event) => event.preventDefault()}>
      <Field id="login-email" label="Correo">
        {(control) => (
          <input
            {...control}
            autoComplete="email"
            className={controlClasses}
            inputMode="email"
            name="email"
            type="email"
          />
        )}
      </Field>
      <Field id="login-password" label="Contraseña">
        {(control) => (
          <input
            {...control}
            autoComplete="current-password"
            className={controlClasses}
            name="password"
            type="password"
          />
        )}
      </Field>
      <Button fullWidth type="submit">
        Entrar
      </Button>
    </form>
  );
}
