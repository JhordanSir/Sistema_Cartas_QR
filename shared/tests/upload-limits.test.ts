import { describe, expect, test } from "@jest/globals";

import { BYTES_PER_MEGABYTE, UPLOAD_LIMITS, toMegabytes } from "../src/index.js";

describe("toMegabytes", () => {
  test("gives the megabytes each upload limit is described with", () => {
    expect(toMegabytes(UPLOAD_LIMITS.logo.maximumBytes)).toBe(2);
    expect(toMegabytes(UPLOAD_LIMITS.menuPhotos.maximumBytesPerPhoto)).toBe(3);
    expect(toMegabytes(UPLOAD_LIMITS.menuPhotos.maximumTotalBytes)).toBe(12);
    expect(toMegabytes(UPLOAD_LIMITS.productImage.maximumBytes)).toBe(4);
  });

  test("keeps fractions of a megabyte", () => {
    expect(toMegabytes(BYTES_PER_MEGABYTE / 2)).toBe(0.5);
  });
});
