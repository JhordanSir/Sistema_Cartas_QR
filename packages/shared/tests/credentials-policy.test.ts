import { describe, expect, test } from "@jest/globals";

import { isValidEmailFormat, meetsPasswordPolicy } from "../src/index.js";

describe("isValidEmailFormat", () => {
  test.each([
    "hola@turestaurante.pe",
    "admin@sirio.pe",
    "nombre.apellido+menu@sub.dominio.com"
  ])("accepts %s", (value) => {
    expect(isValidEmailFormat(value)).toBe(true);
  });

  test.each([
    ["an empty value", ""],
    ["a value without @", "turestaurante.pe"],
    ["a domain without a dot", "hola@turestaurante"],
    ["a missing local part", "@turestaurante.pe"],
    ["a domain starting with a dot", "hola@.pe"],
    ["two @ signs", "hola@@turestaurante.pe"],
    ["inner whitespace", "hola mundo@turestaurante.pe"]
  ])("rejects %s", (_label, value) => {
    expect(isValidEmailFormat(value)).toBe(false);
  });
});

describe("meetsPasswordPolicy", () => {
  test.each([
    ["the minimum length", "Abcdefg1"],
    ["symbols alongside the required characters", "OwnerPass-1!"],
    ["the maximum length", `${"a".repeat(126)}A1`]
  ])("accepts %s", (_label, value) => {
    expect(meetsPasswordPolicy(value)).toBe(true);
  });

  test.each([
    ["an empty value", ""],
    ["seven characters", "Abcdef1"],
    ["no uppercase letter", "abcdefg1"],
    ["no lowercase letter", "ABCDEFG1"],
    ["no digit", "Abcdefgh"],
    ["129 characters", `${"a".repeat(127)}A1`]
  ])("rejects %s", (_label, value) => {
    expect(meetsPasswordPolicy(value)).toBe(false);
  });
});
