type OptionKind = "extra" | "variant";
type SocialNetwork = "facebook" | "instagram" | "tiktok";

/**
 * Every error the API and the web BFF can explain to a person, with the values its
 * message needs. The server sends `{ code, params }` next to its own `message`, and
 * each client translates the code. Adding an entry here makes the type checker ask
 * for its text in every language table.
 */
export interface ApiErrorParamMap {
  ACCESS_DENIED: undefined;
  ACCOUNT_NOT_FOUND: undefined;
  CATEGORY_LAYOUT_INVALID: undefined;
  CATEGORY_NOT_FOUND: undefined;
  CURRENT_PASSWORD_INVALID: undefined;
  DELETION_CONFIRMATION_MISMATCH: { confirmation: string };
  FIELD_INVALID: {
    field:
      | "categoryId"
      | "categoryName"
      | "description"
      | "extraName"
      | "orderId"
      | "productName"
      | "variantName";
  };
  FIELD_PRICE_INVALID: { field: "basePrice" | "extraPrice" | "variantPrice" };
  INVALID_CREDENTIALS: undefined;
  INVALID_ORIGIN: undefined;
  LOGO_FORMAT_INVALID: undefined;
  LOGO_TOO_LARGE: { maxMb: number };
  MENU_EMPTY: undefined;
  MENU_ORDER_DUPLICATED: undefined;
  MENU_ORDER_INCOMPLETE: { subject: "categories" | "items" | "products" };
  MENU_PHOTO_COUNT: { max: number };
  MENU_PHOTO_INVALID: { maxMb: number };
  MENU_PHOTOS_TOO_LARGE: { maxMb: number };
  MENU_TEMPLATE_INVALID: undefined;
  MODEL_MISCONFIGURED: undefined;
  MODEL_RESPONSE_UNREADABLE: undefined;
  MODEL_TIMEOUT: undefined;
  MODEL_UNAVAILABLE: undefined;
  OWNER_EMAIL_INVALID: undefined;
  OWNER_EMAIL_TAKEN: undefined;
  PASSWORD_COMPLEXITY: undefined;
  PASSWORD_LENGTH: { max: number; min: number };
  PASSWORD_REUSE: undefined;
  PRODUCT_AVAILABILITY_INVALID: undefined;
  PRODUCT_IMAGE_INVALID: { maxMb: number };
  PRODUCT_IMAGE_REQUIRED: undefined;
  PRODUCT_NOT_FOUND: undefined;
  PRODUCT_OPTION_DUPLICATED: { kind: OptionKind };
  PRODUCT_OPTION_INVALID: { kind: OptionKind; position: number };
  PRODUCT_OPTION_LIMIT: { kind: OptionKind; max: number };
  PRODUCT_PATCH_EMPTY: undefined;
  PROFILE_FIELD_TOO_LONG: {
    field: "address" | "contactPhone" | "facebookUrl" | "instagramUrl" | "tiktokUrl" | "whatsapp";
    max: number;
  };
  PROFILE_PHONE_INVALID: undefined;
  PROFILE_WHATSAPP_INVALID: undefined;
  QR_UNAVAILABLE: undefined;
  REQUEST_INVALID: undefined;
  RESTAURANT_NAME_LENGTH: { max: number; min: number };
  RESTAURANT_NOT_FOUND: undefined;
  ROLE_MISMATCH: undefined;
  SESSION_EXPIRED: undefined;
  SLUG_UNAVAILABLE: undefined;
  SOCIAL_URL_INCOMPLETE: { network: SocialNetwork };
  SOCIAL_URL_MISMATCH: { network: SocialNetwork };
}

export type ApiErrorCode = keyof ApiErrorParamMap;

/** A code with exactly the params it requires, and no params key when it has none. */
export type ApiProblem = {
  [Code in ApiErrorCode]: ApiErrorParamMap[Code] extends undefined
    ? { code: Code }
    : { code: Code; params: ApiErrorParamMap[Code] };
}[ApiErrorCode];

// A Record keyed by ApiErrorCode fails to compile when a code is missing or extra, so
// the runtime check below can never drift from the interface above.
const API_ERROR_CODES: Record<ApiErrorCode, true> = {
  ACCESS_DENIED: true,
  ACCOUNT_NOT_FOUND: true,
  CATEGORY_LAYOUT_INVALID: true,
  CATEGORY_NOT_FOUND: true,
  CURRENT_PASSWORD_INVALID: true,
  DELETION_CONFIRMATION_MISMATCH: true,
  FIELD_INVALID: true,
  FIELD_PRICE_INVALID: true,
  INVALID_CREDENTIALS: true,
  INVALID_ORIGIN: true,
  LOGO_FORMAT_INVALID: true,
  LOGO_TOO_LARGE: true,
  MENU_EMPTY: true,
  MENU_ORDER_DUPLICATED: true,
  MENU_ORDER_INCOMPLETE: true,
  MENU_PHOTO_COUNT: true,
  MENU_PHOTO_INVALID: true,
  MENU_PHOTOS_TOO_LARGE: true,
  MENU_TEMPLATE_INVALID: true,
  MODEL_MISCONFIGURED: true,
  MODEL_RESPONSE_UNREADABLE: true,
  MODEL_TIMEOUT: true,
  MODEL_UNAVAILABLE: true,
  OWNER_EMAIL_INVALID: true,
  OWNER_EMAIL_TAKEN: true,
  PASSWORD_COMPLEXITY: true,
  PASSWORD_LENGTH: true,
  PASSWORD_REUSE: true,
  PRODUCT_AVAILABILITY_INVALID: true,
  PRODUCT_IMAGE_INVALID: true,
  PRODUCT_IMAGE_REQUIRED: true,
  PRODUCT_NOT_FOUND: true,
  PRODUCT_OPTION_DUPLICATED: true,
  PRODUCT_OPTION_INVALID: true,
  PRODUCT_OPTION_LIMIT: true,
  PRODUCT_PATCH_EMPTY: true,
  PROFILE_FIELD_TOO_LONG: true,
  PROFILE_PHONE_INVALID: true,
  PROFILE_WHATSAPP_INVALID: true,
  QR_UNAVAILABLE: true,
  REQUEST_INVALID: true,
  RESTAURANT_NAME_LENGTH: true,
  RESTAURANT_NOT_FOUND: true,
  ROLE_MISMATCH: true,
  SESSION_EXPIRED: true,
  SLUG_UNAVAILABLE: true,
  SOCIAL_URL_INCOMPLETE: true,
  SOCIAL_URL_MISMATCH: true
};

export function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === "string" && Object.hasOwn(API_ERROR_CODES, value);
}
