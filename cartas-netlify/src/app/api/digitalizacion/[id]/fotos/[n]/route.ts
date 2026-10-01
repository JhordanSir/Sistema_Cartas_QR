import { addPhoto } from '@/server/digitization/jobs';
import { handleApi, jsonResponse, readFormData, requireUuid, validationError } from '@/server/http';
import { requireOwner } from '@/server/next/route-auth';
import { assertSameOrigin } from '@/server/origin';
import { DIGITIZATION_LIMITS } from '@/shared/digitization';
import { detectImageType } from '@/shared/images';

const PHOTO_MESSAGES = {
  missing: 'Elige una foto de la carta.',
  number: 'Puedes subir de 1 a 5 fotos.',
  tooLarge: 'Cada foto puede pesar como máximo 3 MB.',
  type: 'Cada foto debe ser PNG, JPG o WebP.',
} as const;

/**
 * Photo n (1 to 5) of a job in UPLOADING (§E10), multipart field `photo`:
 * at most 3 MB, a real PNG, JPEG or WebP, and 12 MB for the whole job.
 */
export function PUT(request: Request, context: RouteContext<'/api/digitalizacion/[id]/fotos/[n]'>): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request);
    const { restaurant } = await requireOwner(request);
    const params = await context.params;
    const jobId = requireUuid(params.id, 'No encontramos esa digitalización.');
    const photoNumber = Number(params.n);
    if (!Number.isInteger(photoNumber) || photoNumber < 1 || photoNumber > DIGITIZATION_LIMITS.maxPhotos) {
      throw validationError({ photo: PHOTO_MESSAGES.number });
    }

    const photo = (await readFormData(request)).get('photo');
    if (!(photo instanceof File) || photo.size === 0) throw validationError({ photo: PHOTO_MESSAGES.missing });
    if (photo.size > DIGITIZATION_LIMITS.maxPhotoBytes) throw validationError({ photo: PHOTO_MESSAGES.tooLarge });
    const bytes = new Uint8Array(await photo.arrayBuffer());
    const type = detectImageType(bytes);
    if (!type) throw validationError({ photo: PHOTO_MESSAGES.type });

    return jsonResponse({ job: await addPhoto(restaurant.id, jobId, photoNumber, { bytes, type }) });
  });
}
