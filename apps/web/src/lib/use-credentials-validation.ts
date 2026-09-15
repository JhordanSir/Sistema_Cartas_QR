import { type FocusEvent, useState } from 'react';

import {
  type CredentialsMessage,
  emailFormatError,
  passwordPolicyHint,
  passwordRequiredError,
} from './credentials-feedback';

/**
 * Client-side validation shared by the admin and owner login forms.
 *
 * An invalid email or an empty password blocks the request. A password that does
 * not meet the complexity rule only warns: the first submission with that exact
 * value stops to show the hint, and submitting the same value again goes through.
 * Changing the password to another weak one warns again.
 *
 * Messages are added on submit, or on blur only when focus moves into another field
 * of the same form. Pressing a button or a link blurs the input first; adding or
 * removing a message at that moment moves the target between press and release, and
 * the browser drops the click. Typing only ever removes a message once it is fixed.
 */
export function useCredentialsValidation() {
  const [emailError, setEmailError] = useState<CredentialsMessage | null>(null);
  const [passwordError, setPasswordError] = useState<CredentialsMessage | null>(null);
  const [passwordHint, setPasswordHint] = useState<CredentialsMessage | null>(null);
  const [acknowledgedPassword, setAcknowledgedPassword] = useState<string | null>(null);

  function onEmailBlur(event: FocusEvent<HTMLInputElement>) {
    if (!movesToAnotherField(event)) return;
    const { value } = event.currentTarget;
    setEmailError(value.trim() === '' ? null : emailFormatError(value));
  }

  function onEmailChange(value: string) {
    if (emailFormatError(value) === null) setEmailError(null);
  }

  function onPasswordBlur(event: FocusEvent<HTMLInputElement>) {
    if (!movesToAnotherField(event)) return;
    setPasswordHint(passwordPolicyHint(event.currentTarget.value));
  }

  function onPasswordChange(value: string) {
    if (value !== '') setPasswordError(null);
    if (passwordPolicyHint(value) === null) setPasswordHint(null);
  }

  /** Returns true when the credentials may be sent. */
  function approveSubmission(email: string, password: string): boolean {
    const emailProblem = emailFormatError(email);
    const passwordProblem = passwordRequiredError(password);
    const hint = passwordPolicyHint(password);
    setEmailError(emailProblem);
    setPasswordError(passwordProblem);
    setPasswordHint(hint);
    if (emailProblem || passwordProblem) return false;
    if (hint && acknowledgedPassword !== password) {
      setAcknowledgedPassword(password);
      return false;
    }
    return true;
  }

  return {
    approveSubmission,
    emailError,
    onEmailBlur,
    onEmailChange,
    onPasswordBlur,
    onPasswordChange,
    passwordError,
    passwordHint,
  };
}

function movesToAnotherField(event: FocusEvent<HTMLInputElement>): boolean {
  const next = event.relatedTarget;
  return (
    (next instanceof HTMLInputElement ||
      next instanceof HTMLSelectElement ||
      next instanceof HTMLTextAreaElement) &&
    next.form === event.currentTarget.form
  );
}
