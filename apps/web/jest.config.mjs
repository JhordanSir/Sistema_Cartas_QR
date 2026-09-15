import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

export default createJestConfig({
  clearMocks: true,
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/app/layout.tsx",
  ],
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  // @sirio/shared resolves to its source, as in the API suite, so the tests never
  // depend on a stale packages/shared/dist. Its NodeNext imports carry .js suffixes.
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@sirio/shared$": "<rootDir>/../../packages/shared/src/index.ts",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jsdom",
});
