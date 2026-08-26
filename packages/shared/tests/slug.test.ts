import { describe, expect, jest, test } from "@jest/globals";

import {
  RESERVED_SLUGS,
  isReservedSlug,
  normalizeSlug,
  resolveUniqueSlug,
  type SlugExists
} from "../src/index.js";

describe("normalizeSlug", () => {
  test("removes Spanish diacritics", () => {
    expect(normalizeSlug("Árbol, Ñandú y Café Perú")).toBe(
      "arbol-nandu-y-cafe-peru"
    );
  });

  test("normalizes uppercase characters", () => {
    expect(normalizeSlug("PIZZA FÉLIX")).toBe("pizza-felix");
  });

  test.each([
    ["  Pizza   Félix  ", "pizza-felix"],
    ["pizza___felix///express", "pizza-felix-express"],
    ["pizza---felix", "pizza-felix"],
    ["pizza & pasta + bar", "pizza-pasta-bar"]
  ])("normalizes spaces and separators in %s", (value, expected) => {
    expect(normalizeSlug(value)).toBe(expected);
  });

  test("preserves Unicode letters and numbers", () => {
    expect(normalizeSlug("寿司 東京 ９９")).toBe("寿司-東京-99");
  });

  test("normalizes compatibility Unicode characters", () => {
    expect(normalizeSlug("Ｆｏｏ １２３ K")).toBe("foo-123-k");
  });

  test("treats composed and decomposed Unicode consistently", () => {
    expect(normalizeSlug("Café")).toBe(normalizeSlug("Cafe\u0301"));
  });

  test.each(["", "   ", "---", "🍕 ❤️ !!!"])(
    "returns an empty slug when %p has no letters or numbers",
    (value) => {
      expect(normalizeSlug(value)).toBe("");
    }
  );
});

describe("reserved slugs", () => {
  test("exports a frozen, duplicate-free list", () => {
    expect(Object.isFrozen(RESERVED_SLUGS)).toBe(true);
    expect(new Set(RESERVED_SLUGS).size).toBe(RESERVED_SLUGS.length);
  });

  test.each([
    "admin",
    "BACKOFFICE",
    "/api/",
    "  Login  ",
    "_next",
    "favicon.ico",
    "robots.txt",
    "sitemap.xml"
  ])(
    "recognizes %s after normalization",
    (value) => {
      expect(isReservedSlug(value)).toBe(true);
    }
  );

  test("does not reserve an unrelated slug", () => {
    expect(isReservedSlug("mi-admin-restaurante")).toBe(false);
  });
});

describe("resolveUniqueSlug", () => {
  test("returns the normalized base slug when it is available", async () => {
    const slugExists = jest.fn<SlugExists>().mockResolvedValue(false);

    await expect(resolveUniqueSlug("Pizza Félix", slugExists)).resolves.toBe(
      "pizza-felix"
    );
    expect(slugExists).toHaveBeenCalledTimes(1);
    expect(slugExists).toHaveBeenCalledWith("pizza-felix");
  });

  test("increments suffixes until a candidate is available", async () => {
    const occupiedSlugs = new Set(["pizza-felix", "pizza-felix-2"]);
    const checkedCandidates: string[] = [];
    const slugExists: SlugExists = async (candidate) => {
      checkedCandidates.push(candidate);
      return occupiedSlugs.has(candidate);
    };

    await expect(resolveUniqueSlug("Pizza Félix", slugExists)).resolves.toBe(
      "pizza-felix-3"
    );
    expect(checkedCandidates).toEqual([
      "pizza-felix",
      "pizza-felix-2",
      "pizza-felix-3"
    ]);
  });

  test("adds a suffix to a reserved slug without querying that candidate", async () => {
    const slugExists = jest.fn<SlugExists>().mockResolvedValue(false);

    await expect(resolveUniqueSlug("ADMIN", slugExists)).resolves.toBe("admin-2");
    expect(slugExists).toHaveBeenCalledTimes(1);
    expect(slugExists).toHaveBeenCalledWith("admin-2");
  });

  test("continues incrementing when the first suffixed reserved slug exists", async () => {
    const slugExists: SlugExists = async (candidate) => candidate === "api-2";

    await expect(resolveUniqueSlug("api", slugExists)).resolves.toBe("api-3");
  });

  test("supports an available Unicode slug", async () => {
    const slugExists = jest.fn<SlugExists>().mockResolvedValue(false);

    await expect(resolveUniqueSlug("寿司 東京", slugExists)).resolves.toBe(
      "寿司-東京"
    );
  });

  test.each(["", "  ", "🍕---❤️"])(
    "rejects empty normalized input %p before querying availability",
    async (value) => {
      const slugExists = jest.fn<SlugExists>().mockResolvedValue(false);

      await expect(resolveUniqueSlug(value, slugExists)).rejects.toThrow(
        new TypeError("Cannot generate a slug without letters or numbers.")
      );
      expect(slugExists).not.toHaveBeenCalled();
    }
  );

  test("propagates errors from the availability callback", async () => {
    const availabilityError = new Error("database unavailable");
    const slugExists = jest.fn<SlugExists>().mockRejectedValue(availabilityError);

    await expect(resolveUniqueSlug("cevicheria", slugExists)).rejects.toBe(
      availabilityError
    );
  });
});
