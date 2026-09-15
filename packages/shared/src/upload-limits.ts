export const BYTES_PER_MEGABYTE = 1024 * 1024;

/** The image formats every upload accepts, checked by binary signature on the API. */
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/**
 * Upload limits in one place, so the API that enforces them, the BFF that rejects
 * oversized bodies early and the screens that warn before sending never disagree.
 */
export const UPLOAD_LIMITS = {
  logo: { maximumBytes: 2 * BYTES_PER_MEGABYTE },
  menuPhotos: {
    maximumBytesPerPhoto: 3 * BYTES_PER_MEGABYTE,
    maximumPhotoCount: 5,
    maximumTotalBytes: 12 * BYTES_PER_MEGABYTE
  },
  productImage: { maximumBytes: 4 * BYTES_PER_MEGABYTE }
} as const;

/** Bytes as the megabytes quoted in error messages. */
export function toMegabytes(bytes: number): number {
  return bytes / BYTES_PER_MEGABYTE;
}
