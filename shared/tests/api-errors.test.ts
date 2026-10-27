import { describe, expect, test } from "@jest/globals";

import { isApiErrorCode } from "../src/index.js";

describe("isApiErrorCode", () => {
  test.each(["SESSION_EXPIRED", "SOCIAL_URL_MISMATCH", "MENU_EMPTY"])(
    "recognizes %s",
    (code) => {
      expect(isApiErrorCode(code)).toBe(true);
    }
  );

  test.each([
    ["an unknown code", "INVALID_INPUT"],
    ["a lowercase variant", "session_expired"],
    ["an inherited object key", "toString"],
    ["an empty string", ""]
  ])("rejects %s", (_label, value) => {
    expect(isApiErrorCode(value)).toBe(false);
  });

  test.each([undefined, null, 404, { code: "SESSION_EXPIRED" }])(
    "rejects the non-string %p",
    (value) => {
      expect(isApiErrorCode(value)).toBe(false);
    }
  );
});
