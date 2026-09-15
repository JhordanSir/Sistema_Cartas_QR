import { dirname, resolve } from 'node:path';

import {
  ROOT_ENV_FILE,
  resolveRootEnvFile,
  validateEnvironment,
} from './environment.js';

const VALID_DATABASE_URL =
  'postgresql://cartas:secret@localhost:5432/cartas_qr';
const VALID_ENVIRONMENT = {
  DATABASE_URL: VALID_DATABASE_URL,
  GEMINI_API_KEY: 'test-gemini-api-key',
  INITIAL_ADMIN_EMAIL: 'admin@example.com',
  INITIAL_ADMIN_PASSWORD: 'StrongPass-1',
  JWT_ACCESS_SECRET: 'access-secret-with-at-least-32-characters',
  JWT_REFRESH_SECRET: 'refresh-secret-with-at-least-32-characters',
  PUBLIC_APP_URL: 'http://localhost:3000',
  STORAGE_PATH: './storage',
  VIEW_IP_HASH_SECRET: 'view-hash-secret-with-at-least-32-characters',
};

describe('validateEnvironment', () => {
  it('normalizes a valid environment', () => {
    const environment = validateEnvironment({
      ...VALID_ENVIRONMENT,
      API_PORT: '4100',
      CORS_ORIGINS: 'http://localhost:3000, https://menu.example.com',
      JWT_ACCESS_TTL: '20m',
      JWT_AUDIENCE: 'custom-audience',
      JWT_ISSUER: 'custom-issuer',
      JWT_REFRESH_TTL: '10d',
      NODE_ENV: 'production',
      PUBLIC_APP_URL: 'https://menu.example.com/',
      STORAGE_PATH: resolve(dirname(ROOT_ENV_FILE), 'storage'),
    });

    expect(environment).toMatchObject({
      API_PORT: 4100,
      CORS_ORIGINS: 'http://localhost:3000,https://menu.example.com',
      DATABASE_URL: VALID_DATABASE_URL,
      GEMINI_API_KEY: 'test-gemini-api-key',
      INITIAL_ADMIN_EMAIL: 'admin@example.com',
      JWT_ACCESS_TTL_SECONDS: 1_200,
      JWT_AUDIENCE: 'custom-audience',
      JWT_ISSUER: 'custom-issuer',
      JWT_REFRESH_TTL_SECONDS: 864_000,
      NODE_ENV: 'production',
      PUBLIC_APP_URL: 'https://menu.example.com',
      VIEW_IP_HASH_SECRET: 'view-hash-secret-with-at-least-32-characters',
    });
  });

  it('applies safe local defaults', () => {
    const environment = validateEnvironment({
      ...VALID_ENVIRONMENT,
    });

    expect(environment).toMatchObject({
      API_PORT: 3001,
      CORS_ORIGINS: 'http://localhost:3000',
      GEMINI_MAX_RETRIES: 2,
      GEMINI_MODEL: 'gemini-2.5-flash',
      GEMINI_TIMEOUT_MS: 60_000,
      JWT_ACCESS_TTL_SECONDS: 900,
      JWT_AUDIENCE: 'sirio-cartas-qr-api',
      JWT_ISSUER: 'sirio-cartas-qr',
      JWT_REFRESH_TTL_SECONDS: 604_800,
      NODE_ENV: 'development',
      PUBLIC_APP_URL: 'http://localhost:3000',
      STORAGE_PATH: resolve(dirname(ROOT_ENV_FILE), 'storage'),
      VIEW_IP_HASH_SECRET: 'view-hash-secret-with-at-least-32-characters',
    });
  });

  it.each([
    [{}, 'DATABASE_URL is required'],
    [
      { ...VALID_ENVIRONMENT, DATABASE_URL: 'https://localhost/database' },
      'DATABASE_URL must use the postgres or postgresql protocol',
    ],
    [
      { ...VALID_ENVIRONMENT, API_PORT: '70000' },
      'API_PORT must be an integer between 1 and 65535',
    ],
    [
      { ...VALID_ENVIRONMENT, NODE_ENV: 'staging' },
      'NODE_ENV must be one of: development, test, production',
    ],
    [
      { ...VALID_ENVIRONMENT, CORS_ORIGINS: 'menu.example.com' },
      'CORS_ORIGINS contains an invalid URL: menu.example.com',
    ],
    [
      { ...VALID_ENVIRONMENT, PUBLIC_APP_URL: 'menu.example.com' },
      'PUBLIC_APP_URL must be a valid HTTP origin',
    ],
    [
      { ...VALID_ENVIRONMENT, JWT_ACCESS_SECRET: 'short' },
      'JWT_ACCESS_SECRET must contain at least 32 characters',
    ],
    [
      { ...VALID_ENVIRONMENT, VIEW_IP_HASH_SECRET: 'short' },
      'VIEW_IP_HASH_SECRET must contain at least 32 characters',
    ],
    [
      { ...VALID_ENVIRONMENT, JWT_ACCESS_TTL: 'fifteen-minutes' },
      'JWT_ACCESS_TTL must use a duration such as 15m or 7d',
    ],
    [
      { ...VALID_ENVIRONMENT, INITIAL_ADMIN_PASSWORD: 'short' },
      'INITIAL_ADMIN_PASSWORD must contain between 8 and 128 characters',
    ],
    [
      { ...VALID_ENVIRONMENT, INITIAL_ADMIN_PASSWORD: 'strong-password' },
      'INITIAL_ADMIN_PASSWORD must contain an uppercase letter, a lowercase letter and a number',
    ],
    [
      { ...VALID_ENVIRONMENT, STORAGE_PATH: '' },
      'STORAGE_PATH is required',
    ],
    [
      { ...VALID_ENVIRONMENT, GEMINI_API_KEY: '' },
      'GEMINI_API_KEY is required',
    ],
    [
      { ...VALID_ENVIRONMENT, GEMINI_TIMEOUT_MS: '500' },
      'GEMINI_TIMEOUT_MS must be an integer between 1000 and 120000',
    ],
  ])('rejects invalid values', (rawEnvironment, message) => {
    expect(() => validateEnvironment(rawEnvironment)).toThrow(message);
  });
});

describe('resolveRootEnvFile', () => {
  it('resolves from the workspace root used by the container', () => {
    const workspaceRoot = resolve('workspace');

    expect(resolveRootEnvFile(workspaceRoot)).toBe(
      resolve(workspaceRoot, '.env'),
    );
  });

  it('resolves from the API package during local execution', () => {
    const workspaceRoot = resolve('workspace');
    const apiPackage = resolve(workspaceRoot, 'apps', 'api');

    expect(resolveRootEnvFile(apiPackage)).toBe(resolve(workspaceRoot, '.env'));
  });
});
