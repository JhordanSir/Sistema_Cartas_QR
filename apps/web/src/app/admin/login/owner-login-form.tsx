'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export function OwnerLoginForm() {
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
        role: 'OWNER',
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
    router.replace('/admin');
    router.refresh();
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Correo del propietario</span>
        <input
          autoComplete="email"
          name="email"
          placeholder="hola@turestaurante.pe"
          required
          type="email"
        />
      </label>
      <label className="field">
        <span>Contraseña</span>
        <input
          autoComplete="current-password"
          minLength={8}
          name="password"
          required
          type="password"
        />
      </label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="button button-primary button-full" disabled={submitting} type="submit">
        {submitting ? 'Ingresando…' : 'Entrar a mi restaurante'}
      </button>
    </form>
  );
}
