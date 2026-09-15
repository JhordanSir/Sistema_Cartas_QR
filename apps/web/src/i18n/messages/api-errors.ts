import { type ApiErrorCode, type ApiErrorParamMap, deletionConfirmationPhrase } from '@sirio/shared';

import type { Locale } from '../locale';

type Params<Code extends ApiErrorCode> = ApiErrorParamMap[Code];

type Describe<Code extends ApiErrorCode> = Params<Code> extends undefined
  ? string
  : (params: NonNullable<Params<Code>>) => string;

type MenuField = Params<'FIELD_INVALID'>['field'];
type OptionKind = Params<'PRODUCT_OPTION_LIMIT'>['kind'];
type OrderSubject = Params<'MENU_ORDER_INCOMPLETE'>['subject'];
type PriceField = Params<'FIELD_PRICE_INVALID'>['field'];
type ProfileField = Params<'PROFILE_FIELD_TOO_LONG'>['field'];
type SocialNetwork = Params<'SOCIAL_URL_MISMATCH'>['network'];

/**
 * What a person reads when the API or the BFF refuses a request. Where the API's own
 * Spanish text was already clear it is kept word for word; the rest was rewritten
 * because it was in English, named an internal field, or had a typo.
 */
export interface ApiErrorCopy {
  codes: { [Code in ApiErrorCode]: Describe<Code> };
  /** Used when a response carries no code we know: validation arrays, HTML, network. */
  fallback: {
    badRequest: string;
    notFound: string;
    session: string;
    tooLarge: string;
    unavailable: string;
  };
}

const NETWORKS: Record<SocialNetwork, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
};

const ES_MENU_FIELDS: Record<MenuField, string> = {
  categoryId: 'categoría',
  categoryName: 'nombre de categoría',
  description: 'descripción',
  extraName: 'adicional',
  orderId: 'identificador de orden',
  productName: 'nombre del producto',
  variantName: 'variante',
};

const ES_PRICE_FIELDS: Record<PriceField, string> = {
  basePrice: 'precio base',
  extraPrice: 'precio de adicional',
  variantPrice: 'precio de variante',
};

const ES_PROFILE_FIELDS: Record<ProfileField, string> = {
  address: 'La dirección',
  contactPhone: 'El teléfono',
  facebookUrl: 'El enlace de Facebook',
  instagramUrl: 'El enlace de Instagram',
  tiktokUrl: 'El enlace de TikTok',
  whatsapp: 'El WhatsApp',
};

const ES_OPTIONS: Record<OptionKind, { invalid: (position: number) => string; plural: string }> = {
  extra: { invalid: (position) => `El adicional ${position} no es válido.`, plural: 'adicionales' },
  variant: { invalid: (position) => `La variante ${position} no es válida.`, plural: 'variantes' },
};

const ES_ORDER: Record<OrderSubject, string> = {
  categories: 'El orden debe incluir todas las categorías una sola vez.',
  items: 'El orden debe incluir todos los elementos una sola vez.',
  products: 'El orden debe incluir todos los productos de la categoría una sola vez.',
};

const EN_MENU_FIELDS: Record<MenuField, string> = {
  categoryId: 'category',
  categoryName: 'category name',
  description: 'description',
  extraName: 'add-on name',
  orderId: 'order identifier',
  productName: 'product name',
  variantName: 'variant name',
};

const EN_PRICE_FIELDS: Record<PriceField, string> = {
  basePrice: 'base price',
  extraPrice: 'add-on price',
  variantPrice: 'variant price',
};

const EN_PROFILE_FIELDS: Record<ProfileField, string> = {
  address: 'The address',
  contactPhone: 'The phone number',
  facebookUrl: 'The Facebook link',
  instagramUrl: 'The Instagram link',
  tiktokUrl: 'The TikTok link',
  whatsapp: 'The WhatsApp number',
};

const EN_OPTIONS: Record<OptionKind, { invalid: (position: number) => string; one: string; plural: string }> = {
  extra: { invalid: (position) => `Add-on ${position} isn't valid.`, one: 'add-on', plural: 'add-ons' },
  variant: { invalid: (position) => `Variant ${position} isn't valid.`, one: 'variant', plural: 'variants' },
};

const EN_ORDER: Record<OrderSubject, string> = {
  categories: 'The order must include every category exactly once.',
  items: 'The order must include every item exactly once.',
  products: 'The order must include every product in the category exactly once.',
};

export const apiErrorCopy: Record<Locale, ApiErrorCopy> = {
  en: {
    codes: {
      ACCESS_DENIED: "You don't have access to this action.",
      ACCOUNT_NOT_FOUND: "We couldn't find that account.",
      CATEGORY_LAYOUT_INVALID: 'Choose list or cards for the section.',
      CATEGORY_NOT_FOUND: "We couldn't find that section.",
      CURRENT_PASSWORD_INVALID: 'Your current password is incorrect.',
      DELETION_CONFIRMATION_MISMATCH: ({ slug }) =>
        `Type ${deletionConfirmationPhrase(slug, 'en')} and confirm that the deletion is permanent.`,
      FIELD_INVALID: ({ field }) => `The ${EN_MENU_FIELDS[field]} isn't valid.`,
      FIELD_PRICE_INVALID: ({ field }) => `The ${EN_PRICE_FIELDS[field]} isn't a valid price.`,
      INVALID_CREDENTIALS: 'The email or password is incorrect.',
      INVALID_ORIGIN: "We couldn't verify where this request came from. Reload the page and try again.",
      LOGO_FORMAT_INVALID: 'The logo must be a valid PNG, JPG or WebP file.',
      LOGO_TOO_LARGE: ({ maxMb }) => `The logo must be ${maxMb} MB or smaller.`,
      MENU_EMPTY: 'Add at least one available product before publishing the menu.',
      MENU_ORDER_DUPLICATED: 'The order contains repeated items.',
      MENU_ORDER_INCOMPLETE: ({ subject }) => EN_ORDER[subject],
      MENU_PHOTO_COUNT: ({ max }) => `Upload between 1 and ${max} photos of the menu.`,
      MENU_PHOTO_INVALID: ({ maxMb }) =>
        `Each photo must be a valid JPG, PNG or WebP file up to ${maxMb} MB.`,
      MENU_PHOTOS_TOO_LARGE: ({ maxMb }) => `The photos exceed the ${maxMb} MB total limit.`,
      MENU_TEMPLATE_INVALID: 'Choose a valid template.',
      MODEL_MISCONFIGURED: "Gemini isn't set up correctly. Contact the administrator.",
      MODEL_RESPONSE_UNREADABLE: "Gemini couldn't read a valid menu. Try sharper photos.",
      MODEL_TIMEOUT: 'Gemini took too long to respond. Please try again.',
      MODEL_UNAVAILABLE: 'Gemini is temporarily unavailable. Try again in a few minutes.',
      OWNER_EMAIL_INVALID: 'Enter a valid email for the owner.',
      OWNER_EMAIL_TAKEN: 'An owner account already uses that email.',
      PASSWORD_COMPLEXITY:
        'The password must include an uppercase letter, a lowercase letter and a number.',
      PASSWORD_LENGTH: ({ max, min }) => `The password must be between ${min} and ${max} characters.`,
      PASSWORD_REUSE: 'The new password must be different from your current one.',
      PRODUCT_AVAILABILITY_INVALID: "The availability isn't valid.",
      PRODUCT_IMAGE_INVALID: ({ maxMb }) =>
        `The image must be a valid PNG, JPG or WebP file up to ${maxMb} MB.`,
      PRODUCT_IMAGE_REQUIRED: 'Choose an image for the product.',
      PRODUCT_NOT_FOUND: "We couldn't find that product.",
      PRODUCT_OPTION_DUPLICATED: ({ kind }) =>
        `Don't repeat ${EN_OPTIONS[kind].one} names on the same product.`,
      PRODUCT_OPTION_INVALID: ({ kind, position }) => EN_OPTIONS[kind].invalid(position),
      PRODUCT_OPTION_LIMIT: ({ kind, max }) =>
        `A product can have up to ${max} ${EN_OPTIONS[kind].plural}.`,
      PRODUCT_PATCH_EMPTY: 'Change at least one detail of the product.',
      PROFILE_FIELD_TOO_LONG: ({ field, max }) =>
        `${EN_PROFILE_FIELDS[field]} can't be longer than ${max} characters.`,
      PROFILE_PHONE_INVALID: "The phone number contains characters that aren't allowed.",
      PROFILE_WHATSAPP_INVALID: "The WhatsApp number contains characters that aren't allowed.",
      QR_UNAVAILABLE: "We couldn't generate the QR. Please try again.",
      REQUEST_INVALID: 'Check the details and try again.',
      RESTAURANT_NAME_LENGTH: ({ max, min }) =>
        `The restaurant name must be between ${min} and ${max} characters.`,
      RESTAURANT_NOT_FOUND: "We couldn't find that restaurant.",
      ROLE_MISMATCH: "This account can't access this section. Sign in with the right account.",
      SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
      SLUG_UNAVAILABLE: "We couldn't create a unique address for the restaurant. Try another name.",
      SOCIAL_URL_INCOMPLETE: ({ network }) =>
        `The ${NETWORKS[network]} link must be a full URL starting with https://.`,
      SOCIAL_URL_MISMATCH: ({ network }) =>
        `The link doesn't point to ${NETWORKS[network]} or doesn't use HTTPS.`,
    },
    fallback: {
      badRequest: 'Check the details and try again.',
      notFound: "We couldn't find what you were looking for.",
      session: 'Your session has expired. Please sign in again.',
      tooLarge: 'The file is too large.',
      unavailable: "We couldn't complete the action. Please try again.",
    },
  },
  es: {
    codes: {
      ACCESS_DENIED: 'No tienes acceso a esta acción.',
      ACCOUNT_NOT_FOUND: 'No encontramos esa cuenta.',
      CATEGORY_LAYOUT_INVALID: 'Elige lista o tarjetas para la sección.',
      CATEGORY_NOT_FOUND: 'No encontramos esa sección.',
      CURRENT_PASSWORD_INVALID: 'La contraseña actual no es correcta.',
      DELETION_CONFIRMATION_MISMATCH: ({ slug }) =>
        `Escribe ${deletionConfirmationPhrase(slug, 'es')} y confirma que la eliminación es definitiva.`,
      FIELD_INVALID: ({ field }) => `El campo ${ES_MENU_FIELDS[field]} no es válido.`,
      FIELD_PRICE_INVALID: ({ field }) => `El campo ${ES_PRICE_FIELDS[field]} no es un precio válido.`,
      INVALID_CREDENTIALS: 'El correo o la contraseña no son correctos.',
      INVALID_ORIGIN:
        'No pudimos verificar el origen de la solicitud. Recarga la página e inténtalo de nuevo.',
      LOGO_FORMAT_INVALID: 'El logo debe ser un archivo PNG, JPG o WebP válido.',
      LOGO_TOO_LARGE: ({ maxMb }) => `El logo debe pesar como máximo ${maxMb} MB.`,
      MENU_EMPTY: 'Agrega al menos un producto disponible antes de publicar la carta.',
      MENU_ORDER_DUPLICATED: 'El orden contiene elementos repetidos.',
      MENU_ORDER_INCOMPLETE: ({ subject }) => ES_ORDER[subject],
      MENU_PHOTO_COUNT: ({ max }) => `Sube entre 1 y ${max} fotos de la carta.`,
      MENU_PHOTO_INVALID: ({ maxMb }) =>
        `Cada foto debe ser un archivo JPG, PNG o WebP válido de hasta ${maxMb} MB.`,
      MENU_PHOTOS_TOO_LARGE: ({ maxMb }) => `Las fotos superan el límite total de ${maxMb} MB.`,
      MENU_TEMPLATE_INVALID: 'Selecciona una plantilla válida.',
      MODEL_MISCONFIGURED: 'Gemini no está configurado correctamente. Contacta al administrador.',
      MODEL_RESPONSE_UNREADABLE:
        'Gemini no pudo interpretar una carta válida. Prueba con fotos más nítidas.',
      MODEL_TIMEOUT: 'Gemini tardó demasiado en responder. Inténtalo nuevamente.',
      MODEL_UNAVAILABLE: 'Gemini no está disponible temporalmente. Inténtalo en unos minutos.',
      OWNER_EMAIL_INVALID: 'Escribe un correo válido para el propietario.',
      OWNER_EMAIL_TAKEN: 'Ya existe una cuenta de propietario con ese correo.',
      PASSWORD_COMPLEXITY: 'La contraseña debe incluir una mayúscula, una minúscula y un número.',
      PASSWORD_LENGTH: ({ max, min }) => `La contraseña debe tener entre ${min} y ${max} caracteres.`,
      PASSWORD_REUSE: 'La nueva contraseña debe ser distinta de la actual.',
      PRODUCT_AVAILABILITY_INVALID: 'La disponibilidad no es válida.',
      PRODUCT_IMAGE_INVALID: ({ maxMb }) =>
        `La imagen debe ser un archivo PNG, JPG o WebP válido de hasta ${maxMb} MB.`,
      PRODUCT_IMAGE_REQUIRED: 'Elige una imagen para el producto.',
      PRODUCT_NOT_FOUND: 'No encontramos ese producto.',
      PRODUCT_OPTION_DUPLICATED: ({ kind }) =>
        `No repitas nombres de ${ES_OPTIONS[kind].plural} en el mismo producto.`,
      PRODUCT_OPTION_INVALID: ({ kind, position }) => ES_OPTIONS[kind].invalid(position),
      PRODUCT_OPTION_LIMIT: ({ kind, max }) =>
        `El producto admite hasta ${max} ${ES_OPTIONS[kind].plural}.`,
      PRODUCT_PATCH_EMPTY: 'Envía al menos un cambio para el producto.',
      PROFILE_FIELD_TOO_LONG: ({ field, max }) =>
        `${ES_PROFILE_FIELDS[field]} supera el máximo de ${max} caracteres.`,
      PROFILE_PHONE_INVALID: 'El teléfono contiene caracteres no permitidos.',
      PROFILE_WHATSAPP_INVALID: 'El WhatsApp contiene caracteres no permitidos.',
      QR_UNAVAILABLE: 'No pudimos generar el QR. Vuelve a intentarlo.',
      REQUEST_INVALID: 'Revisa los datos e inténtalo de nuevo.',
      RESTAURANT_NAME_LENGTH: ({ max, min }) =>
        `El nombre del restaurante debe tener entre ${min} y ${max} caracteres.`,
      RESTAURANT_NOT_FOUND: 'No encontramos ese restaurante.',
      ROLE_MISMATCH: 'Esta cuenta no tiene acceso a esta sección. Ingresa con la cuenta correcta.',
      SESSION_EXPIRED: 'Tu sesión expiró. Vuelve a ingresar.',
      SLUG_UNAVAILABLE:
        'No pudimos generar una dirección única para el restaurante. Prueba con otro nombre.',
      SOCIAL_URL_INCOMPLETE: ({ network }) =>
        `El enlace de ${NETWORKS[network]} debe ser una URL completa que empiece por https://.`,
      SOCIAL_URL_MISMATCH: ({ network }) =>
        `El enlace no corresponde a ${NETWORKS[network]} o no usa HTTPS.`,
    },
    fallback: {
      badRequest: 'Revisa los datos e inténtalo de nuevo.',
      notFound: 'No encontramos lo que buscabas.',
      session: 'Tu sesión expiró. Vuelve a ingresar.',
      tooLarge: 'El archivo es demasiado grande.',
      unavailable: 'No pudimos completar la operación. Vuelve a intentarlo.',
    },
  },
};
