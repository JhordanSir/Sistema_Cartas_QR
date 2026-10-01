'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';

import { prepareImage } from '@/components/forms/prepare-image';
import { sendForm } from '@/components/forms/send-json';
import { focusFirstError, useFormFields } from '@/components/forms/use-form-fields';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { controlClasses, Field } from '@/components/ui/field';
import { Card, Notice } from '@/components/ui/surfaces';
import { ACCEPTED_IMAGE_TYPES, IMAGE_MESSAGES, LOGO_MAX_BYTES } from '@/shared/images';
import { GENERIC_ERROR_MESSAGE } from '@/shared/messages';
import {
  ADDRESS_MAX_LENGTH,
  parseProfileView,
  profileFormValues,
  validateProfileForm,
  type ProfileValues,
  type ProfileView,
} from '@/shared/profile';
import { RESTAURANT_NAME_MAX_LENGTH } from '@/shared/validation';

// Screen order: the first field with an error gets the focus.
const FIELD_IDS = {
  logo: 'profile-logo',
  name: 'profile-name',
  contactPhone: 'profile-phone',
  whatsapp: 'profile-whatsapp',
  address: 'profile-address',
  instagramUrl: 'profile-instagram',
  facebookUrl: 'profile-facebook',
  tiktokUrl: 'profile-tiktok',
} as const;

/**
 * The native file input names its button in the browser's language («Choose
 * File»), so it stays hidden and this button opens it instead.
 */
const LOGO_BUTTON_ID = 'profile-logo-button';
const FOCUS_IDS = { ...FIELD_IDS, logo: LOGO_BUTTON_ID };

/** The logo as the owner sees it before saving. */
type LogoState =
  | { kind: 'saved'; url: string | null }
  | { kind: 'new'; file: File; previewUrl: string }
  | { kind: 'removed' };

export function ProfileForm({ initialProfile }: { initialProfile: ProfileView }) {
  const router = useRouter();
  const form = useFormFields(profileFormValues(initialProfile), validateProfileForm);
  const [logo, setLogo] = useState<LogoState>({ kind: 'saved', url: initialProfile.logoUrl });
  const [logoError, setLogoError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  // Compressing a big photo takes a moment; saving meanwhile would drop the logo.
  const [preparingLogo, setPreparingLogo] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const previewUrl = logo.kind === 'new' ? logo.previewUrl : null;
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function chooseLogo(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;
    setFeedback(null);
    setPreparingLogo(true);
    const prepared = await prepareImage(file, {
      maxBytes: LOGO_MAX_BYTES,
      tooLargeMessage: IMAGE_MESSAGES.logoTooLarge,
    });
    setPreparingLogo(false);
    if (!prepared.ok) {
      setLogoError(prepared.error);
      event.target.value = '';
      return;
    }
    setLogoError(null);
    setLogo({ file: prepared.file, kind: 'new', previewUrl: URL.createObjectURL(prepared.file) });
  }

  function removeLogo(): void {
    setLogoError(null);
    setLogo({ kind: 'removed' });
    if (fileInput.current) fileInput.current.value = '';
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (preparingLogo) return;
    setFeedback(null);
    if (focusFirstError(form.validateAll(), FOCUS_IDS)) return;

    const body = new FormData();
    for (const [field, value] of Object.entries(form.values)) body.set(field, value);
    if (logo.kind === 'new') body.set('logo', logo.file);
    if (logo.kind === 'removed') body.set('removeLogo', '1');

    setPending(true);
    const result = await sendForm('/api/perfil', 'PATCH', body);
    setPending(false);
    if (!result.ok) {
      if (result.error.fields) {
        const { logo: logoMessage, ...fieldErrors } = result.error.fields;
        setLogoError(logoMessage ?? null);
        form.setServerErrors(fieldErrors);
        focusFirstError(result.error.fields, FOCUS_IDS);
      } else {
        setFeedback({ text: result.error.message, tone: 'error' });
      }
      return;
    }

    const saved = parseProfileView(result.data);
    if (!saved) {
      setFeedback({ text: GENERIC_ERROR_MESSAGE, tone: 'error' });
      return;
    }
    setLogo({ kind: 'saved', url: saved.logoUrl });
    if (fileInput.current) fileInput.current.value = '';
    setFeedback({ text: 'Perfil guardado.', tone: 'success' });
    router.refresh();
  }

  const shownLogo = logo.kind === 'new' ? logo.previewUrl : logo.kind === 'saved' ? logo.url : null;

  const textField = (
    field: keyof ProfileValues,
    label: string,
    props: { autoComplete?: string; inputMode?: 'tel' | 'url'; maxLength?: number; placeholder?: string; type?: string } = {},
  ) => (
    <Field error={form.errors[field]} id={FIELD_IDS[field]} label={label}>
      {(control) => (
        <input
          {...control}
          {...props}
          className={controlClasses}
          name={field}
          onChange={(changeEvent) => form.setValue(field, changeEvent.target.value)}
          value={form.values[field]}
        />
      )}
    </Field>
  );

  return (
    <Card className="p-6">
      <form className="grid gap-6" noValidate onSubmit={handleSubmit}>
        <div className="grid gap-1">
          <h2 className="m-0 font-display text-xl font-semibold">Datos del restaurante</h2>
          <p className="m-0 text-sm text-ink-soft">Así te verán tus clientes en la carta digital.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-[7rem_1fr] sm:items-start">
          <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-card border border-line bg-control">
            {shownLogo ? (
              // eslint-disable-next-line @next/next/no-img-element -- blob: previews and /media URLs
              <img alt="Logo del restaurante" className="h-full w-full object-contain" src={shownLogo} />
            ) : (
              <span className="px-2 text-center text-xs text-ink-muted">Sin logo</span>
            )}
          </div>
          <Field
            error={logoError}
            hint="PNG, JPG o WebP. Si pesa más de 2 MB o mide más de 1600 px, lo reducimos antes de subirlo."
            id={FIELD_IDS.logo}
            label="Logo"
          >
            {(control) => (
              <div className="flex flex-wrap items-center gap-3">
                <input
                  {...control}
                  accept={ACCEPTED_IMAGE_TYPES}
                  className="sr-only"
                  name="logo"
                  onChange={chooseLogo}
                  ref={fileInput}
                  tabIndex={-1}
                  type="file"
                />
                <Button
                  aria-describedby={control['aria-describedby']}
                  id={LOGO_BUTTON_ID}
                  onClick={() => fileInput.current?.click()}
                  variant="secondary"
                >
                  {shownLogo ? 'Cambiar logo' : 'Elegir logo'}
                </Button>
                {shownLogo ? (
                  <Button onClick={removeLogo} variant="secondary">
                    Quitar logo
                  </Button>
                ) : null}
              </div>
            )}
          </Field>
        </div>

        {textField('name', 'Nombre del restaurante', {
          autoComplete: 'organization',
          maxLength: RESTAURANT_NAME_MAX_LENGTH,
        })}
        <div className="grid gap-4 sm:grid-cols-2">
          {textField('contactPhone', 'Teléfono', { autoComplete: 'tel', inputMode: 'tel', type: 'tel' })}
          {textField('whatsapp', 'WhatsApp', { inputMode: 'tel', type: 'tel' })}
        </div>
        <Field error={form.errors.address} id={FIELD_IDS.address} label="Dirección">
          {(control) => (
            <textarea
              {...control}
              autoComplete="street-address"
              className={cn(controlClasses, 'min-h-20 resize-y')}
              maxLength={ADDRESS_MAX_LENGTH}
              name="address"
              onChange={(changeEvent) => form.setValue('address', changeEvent.target.value)}
              rows={2}
              value={form.values.address}
            />
          )}
        </Field>
        <fieldset className="m-0 grid gap-4 border-0 p-0">
          <legend className="mb-1 p-0 text-sm font-semibold text-ink">Redes sociales (opcional)</legend>
          {textField('instagramUrl', 'Instagram', {
            inputMode: 'url',
            placeholder: 'https://www.instagram.com/turestaurante',
            type: 'url',
          })}
          {textField('facebookUrl', 'Facebook', {
            inputMode: 'url',
            placeholder: 'https://www.facebook.com/turestaurante',
            type: 'url',
          })}
          {textField('tiktokUrl', 'TikTok', {
            inputMode: 'url',
            placeholder: 'https://www.tiktok.com/@turestaurante',
            type: 'url',
          })}
        </fieldset>

        {feedback ? <Notice tone={feedback.tone}>{feedback.text}</Notice> : null}
        <Button className="justify-self-start" disabled={pending || preparingLogo} type="submit">
          {pending ? 'Guardando…' : preparingLogo ? 'Preparando el logo…' : 'Guardar perfil'}
        </Button>
      </form>
    </Card>
  );
}
