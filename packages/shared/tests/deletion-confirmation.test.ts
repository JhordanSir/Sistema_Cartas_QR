import { describe, expect, test } from "@jest/globals";

import { deletionConfirmationPhrase, isDeletionConfirmed } from "../src/index.js";

describe("deletionConfirmationPhrase", () => {
  test("uses the verb of each interface language", () => {
    expect(deletionConfirmationPhrase("luna", "es")).toBe("ELIMINAR luna");
    expect(deletionConfirmationPhrase("luna", "en")).toBe("DELETE luna");
  });
});

describe("isDeletionConfirmed", () => {
  test.each(["ELIMINAR luna", "DELETE luna"])("accepts %s", (text) => {
    expect(isDeletionConfirmed(text, "luna")).toBe(true);
  });

  test.each([
    ["another restaurant's slug", "DELETE sol"],
    ["a lowercase verb", "delete luna"],
    ["a leading space", " ELIMINAR luna"],
    ["the verb alone", "ELIMINAR"],
    ["an empty text", ""]
  ])("rejects %s", (_label, text) => {
    expect(isDeletionConfirmed(text, "luna")).toBe(false);
  });
});
