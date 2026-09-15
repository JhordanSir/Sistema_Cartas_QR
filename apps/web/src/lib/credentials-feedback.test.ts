import { emailFormatError, passwordPolicyHint, passwordRequiredError } from './credentials-feedback';

describe('credentials feedback', () => {
  it('accepts a well-formed email, ignoring surrounding spaces', () => {
    expect(emailFormatError('  hola@turestaurante.pe ')).toBeNull();
  });

  it.each(['', 'turestaurante.pe', 'hola@turestaurante', 'hola mundo@turestaurante.pe'])(
    'flags the email format when it is %p',
    (value) => {
      expect(emailFormatError(value)).toBe('emailFormat');
    },
  );

  it('asks for the password only when it is empty', () => {
    expect(passwordRequiredError('')).toBe('passwordRequired');
    expect(passwordRequiredError('cualquier-cosa')).toBeNull();
  });

  it('does not hint on an empty or compliant password', () => {
    expect(passwordPolicyHint('')).toBeNull();
    expect(passwordPolicyHint('OwnerPass-1')).toBeNull();
  });

  it.each(['contraseña-antigua', 'SOLOMAYUSCULA1', 'SinNumeroAqui', 'Corta1'])(
    'recommends a stronger password for %p',
    (value) => {
      expect(passwordPolicyHint(value)).toBe('passwordPolicy');
    },
  );
});
