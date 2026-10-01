import { deleteBlobQuietly, logoKey, putImage } from '@/server/blobs';
import {
  ApiError,
  formText,
  handleApi,
  jsonResponse,
  readFormData,
  validationError,
} from '@/server/http';
import { requireOwner } from '@/server/next/route-auth';
import { assertSameOrigin } from '@/server/origin';
import { getProfile, saveProfile, toProfileView } from '@/server/profile';
import { hasErrors } from '@/shared/account-forms';
import { detectImageType, IMAGE_MESSAGES, LOGO_MAX_BYTES, type ImageMimeType } from '@/shared/images';
import { normalizeProfile, validateProfileForm, type ProfileValues } from '@/shared/profile';

export function GET(request: Request): Promise<Response> {
  return handleApi(async () => {
    const { restaurant } = await requireOwner(request);
    const profile = await getProfile(restaurant.id);
    if (!profile) throw new ApiError(404, 'NOT_FOUND', 'No encontramos tu restaurante.');
    return jsonResponse({ profile: toProfileView(profile) });
  });
}

/** The logo of the form, already validated by size and binary signature (§E6). */
async function readLogo(form: FormData): Promise<{ bytes: Uint8Array; type: ImageMimeType } | null> {
  const logo = form.get('logo');
  if (!(logo instanceof File) || logo.size === 0) return null;
  if (logo.size > LOGO_MAX_BYTES) throw validationError({ logo: IMAGE_MESSAGES.logoTooLarge });
  const bytes = new Uint8Array(await logo.arrayBuffer());
  const type = detectImageType(bytes);
  if (!type) throw validationError({ logo: IMAGE_MESSAGES.logoType });
  return { bytes, type };
}

/**
 * Saves the whole profile (multipart). The name can change; the slug never
 * does. A new logo is uploaded first and the previous one is deleted only
 * after the database change is committed.
 */
export function PATCH(request: Request): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request);
    const { restaurant } = await requireOwner(request);
    const form = await readFormData(request);

    const values: ProfileValues = {
      address: formText(form, 'address'),
      contactPhone: formText(form, 'contactPhone'),
      facebookUrl: formText(form, 'facebookUrl'),
      instagramUrl: formText(form, 'instagramUrl'),
      name: formText(form, 'name'),
      tiktokUrl: formText(form, 'tiktokUrl'),
      whatsapp: formText(form, 'whatsapp'),
    };
    const errors = validateProfileForm(values);
    if (hasErrors(errors)) throw validationError(errors);

    const logo = await readLogo(form);
    const newLogoKey = logo ? logoKey(restaurant.id) : null;
    if (logo && newLogoKey) await putImage(newLogoKey, logo.bytes, logo.type);

    const removeLogo = formText(form, 'removeLogo') === '1';
    let saved: Awaited<ReturnType<typeof saveProfile>>;
    try {
      saved = await saveProfile(
        restaurant.id,
        normalizeProfile(values),
        newLogoKey ?? (removeLogo ? null : undefined),
      );
    } catch (error) {
      if (newLogoKey) await deleteBlobQuietly(newLogoKey);
      throw error;
    }

    if (saved.previousLogoKey && saved.previousLogoKey !== saved.profile.logoKey) {
      await deleteBlobQuietly(saved.previousLogoKey);
    }
    return jsonResponse({ profile: toProfileView(saved.profile) });
  });
}
