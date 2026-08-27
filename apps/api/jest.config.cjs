/** @type {import('jest').Config} */
module.exports = {
  clearMocks: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/generated/prisma/**',
    '!src/main.ts',
    '!src/testing/**',
  ],
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  moduleFileExtensions: ['js', 'json', 'ts'],
  moduleNameMapper: {
    '^@sirio/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  roots: ['<rootDir>/src'],
  testEnvironment: 'node',
  testMatch: ['**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            decorators: true,
            syntax: 'typescript',
          },
          target: 'es2023',
          transform: {
            decoratorMetadata: true,
            legacyDecorator: true,
          },
        },
        module: {
          type: 'commonjs',
        },
      },
    ],
  },
};
