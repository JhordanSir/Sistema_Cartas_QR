export { isApiErrorCode } from "./api-errors.js";

export type { ApiErrorCode, ApiErrorParamMap, ApiProblem } from "./api-errors.js";

export { deletionConfirmationPhrase, isDeletionConfirmed } from "./deletion-confirmation.js";

export type { DeletionConfirmationLanguage } from "./deletion-confirmation.js";

export {
  isValidEmailFormat,
  meetsPasswordPolicy
} from "./credentials-policy.js";

export { ACCESS_TOKEN_COOKIE, REALTIME_CLOSE_CODES, REALTIME_PATH } from "./realtime.js";

export type {
  DigitizationSubscription,
  RealtimeErrorCode,
  RealtimeServerMessage
} from "./realtime.js";

export {
  RESERVED_SLUGS,
  isReservedSlug,
  normalizeSlug,
  resolveUniqueSlug
} from "./slug.js";

export type { SlugExists } from "./slug.js";

export {
  ACCEPTED_IMAGE_TYPES,
  BYTES_PER_MEGABYTE,
  UPLOAD_LIMITS,
  toMegabytes
} from "./upload-limits.js";
