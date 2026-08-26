import { resolve } from 'node:path';

import {
  resolveRootEnvFile,
  validateEnvironment,
} from './environment.js';

const VALID_DATABASE_URL =
  'postgresql://cartas:secret@localhost:5432/cartas_qr';

describe('validateEnvironment', () => {
  it('normalizes a valid environment', () => {
    const environment = validateEnvironment({
      API_PORT: '4100',
      CORS_ORIGINS: 'http://localhost:3000, https://menu.example.com',
      DATABASE_URL: VALID_DATABASE_URL,
      NODE_ENV: 'production',
    });

    expect(environment).toMatchObject({
      API_PORT: 4100,
      CORS_ORIGINS: 'http://localhost:3000,https://menu.example.com',
      DATABASE_URL: VALID_DATABASE_URL,
      NODE_ENV: 'production',
    });
  });

  it('applies safe local defaults', () => {
    const environment = validateEnvironment({
      DATABASE_URL: VALID_DATABASE_URL,
    });

    expect(environment).toMatchObject({
      API_PORT: 3001,
      CORS_ORIGINS: 'http://localhost:3000',
      NODE_ENV: 'development',
    });
  });

  it.each([
    [{}, 'DATABASE_URL is required'],
    [
      { DATABASE_URL: 'https://localhost/database' },
      'DATABASE_URL must use the postgres or postgresql protocol',
    ],
    [
      { API_PORT: '70000', DATABASE_URL: VALID_DATABASE_URL },
      'API_PORT must be an integer between 1 and 65535',
    ],
    [
      { DATABASE_URL: VALID_DATABASE_URL, NODE_ENV: 'staging' },
      'NODE_ENV must be one of: development, test, production',
    ],
    [
      { CORS_ORIGINS: 'menu.example.com', DATABASE_URL: VALID_DATABASE_URL },
      'CORS_ORIGINS contains an invalid URL: menu.example.com',
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
