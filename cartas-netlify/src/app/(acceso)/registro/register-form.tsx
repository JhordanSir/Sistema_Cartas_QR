'use client';

import { Button } from '@/components/ui/button';
import { controlClasses, Field } from '@/components/ui/field';

// Layout only for now: registration is wired up in phase 3.
export function RegisterForm() {
  return (
    <form className="grid gap-4" noValidate onSubmit={(event) => event.preventDefault()}>
      <Field id="register-restaurant" label="Nombre del restaurante">
        {(control) => (
          <input
            {...control}
            autoComplete="organization"
            className={controlClasses}
            maxLength={160}
            name="restaurantName"
          />
        )}
      </Field>
      <Field id="register-email" label="Correo">
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
      <Field
        hint="Entre 8 y 128 caracteres, con una mayúscula, una minúscula y un número."
        id="register-password"
        label="Contraseña"
      >
        {(control) => (
          <input
            {...control}
            autoComplete="new-password"
            className={controlClasses}
            name="password"
            type="password"
          />
        )}
      </Field>
      <Field id="register-password-confirmation" label="Repite la contraseña">
        {(control) => (
          <input
            {...control}
            autoComplete="new-password"
            className={controlClasses}
            name="passwordConfirmation"
            type="password"
          />
        )}
      </Field>
      <Button fullWidth type="submit">
        Crear cuenta
      </Button>
    </form>
  );
}
