import type { CredentialsMessage } from '@/lib/credentials-feedback';

import type { Locale } from '../locale';

interface DoorCopy {
  emailLabel: string;
  kicker: string;
  lede: string;
  submit: string;
  title: string;
}

/** The two access screens and the validation they share. */
interface LoginCopy {
  admin: DoorCopy;
  feedback: Record<CredentialsMessage, string>;
  invalidCredentials: string;
  owner: DoorCopy & { forgotAccess: string };
  serviceUnavailable: string;
  submitting: string;
}

export const loginCopy: Record<Locale, LoginCopy> = {
  en: {
    admin: {
      emailLabel: 'Administrator email',
      kicker: 'Platform access',
      lede: 'Onboard restaurants, manage their availability and remove them for good.',
      submit: 'Go to the back office',
      title: 'Your control desk.',
    },
    feedback: {
      emailFormat: 'Enter a valid email, for example name@domain.com.',
      passwordPolicy:
        'We recommend an uppercase letter, a lowercase letter and a number. If this is your current password, press again to sign in.',
      passwordRequired: 'Enter your password.',
    },
    invalidCredentials: 'The email or password is incorrect.',
    owner: {
      emailLabel: 'Owner email',
      forgotAccess: 'Lost your access? Message us at',
      kicker: 'Restaurant panel',
      lede: "Complete your restaurant's identity and get its digital presence ready.",
      submit: 'Go to my restaurant',
      title: 'Your menu starts here.',
    },
    serviceUnavailable: "We couldn't sign you in. Please try again.",
    submitting: 'Signing in…',
  },
  es: {
    admin: {
      emailLabel: 'Correo del administrador',
      kicker: 'Acceso de plataforma',
      lede: 'Administra altas, disponibilidad y bajas definitivas de restaurantes.',
      submit: 'Entrar al backoffice',
      title: 'Tu mesa de control.',
    },
    feedback: {
      emailFormat: 'Escribe un correo válido, por ejemplo nombre@dominio.com.',
      passwordPolicy:
        'Recomendamos mayúscula, minúscula y número. Si es tu contraseña actual, vuelve a pulsar para entrar.',
      passwordRequired: 'Escribe tu contraseña.',
    },
    invalidCredentials: 'El correo o la contraseña no son correctos.',
    owner: {
      emailLabel: 'Correo del propietario',
      forgotAccess: '¿Olvidaste tu acceso? Escríbenos al',
      kicker: 'Panel del restaurante',
      lede: 'Completa la identidad de tu restaurante y prepara su presencia digital.',
      submit: 'Entrar a mi restaurante',
      title: 'Tu carta empieza aquí.',
    },
    serviceUnavailable: 'No pudimos iniciar sesión. Inténtalo nuevamente.',
    submitting: 'Ingresando…',
  },
};
