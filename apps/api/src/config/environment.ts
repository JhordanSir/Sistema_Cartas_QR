import { basename, dirname, resolve } from 'node:path';

const NODE_ENVIRONMENTS = ['development', 'test', 'production'] as const;
const DEFAULT_API_PORT = 3001;
const DEFAULT_CORS_ORIGINS = 'http://localhost:3000';

type NodeEnvironment = (typeof NODE_ENVIRONMENTS)[number];

export interface Environment extends Record<string, unknown> {
  API_PORT: number;
  CORS_ORIGINS: string;
  DATABASE_URL: string;
  NODE_ENV: NodeEnvironment;
}

export const ROOT_ENV_FILE = resolveRootEnvFile(process.cwd());

export function validateEnvironment(
  rawEnvironment: Record<string, unknown>,
): Environment {
  return {
    ...rawEnvironment,
    API_PORT: parsePort(rawEnvironment.API_PORT),
    CORS_ORIGINS: parseCorsOrigins(rawEnvironment.CORS_ORIGINS),
    DATABASE_URL: parseDatabaseUrl(rawEnvironment.DATABASE_URL),
    NODE_ENV: parseNodeEnvironment(rawEnvironment.NODE_ENV),
  };
}

export function resolveRootEnvFile(currentDirectory: string): string {
  const isApiPackage =
    basename(currentDirectory) === 'api' &&
    basename(dirname(currentDirectory)) === 'apps';
  const workspaceRoot = isApiPackage
    ? resolve(currentDirectory, '..', '..')
    : currentDirectory;

  return resolve(workspaceRoot, '.env');
}

function parsePort(value: unknown): number {
  if (value === undefined || value === '') {
    return DEFAULT_API_PORT;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('API_PORT must be an integer between 1 and 65535');
  }

  return port;
}

function parseCorsOrigins(value: unknown): string {
  if (value === undefined || value === '') {
    return DEFAULT_CORS_ORIGINS;
  }

  if (typeof value !== 'string') {
    throw new Error('CORS_ORIGINS must be a comma-separated string');
  }

  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error('CORS_ORIGINS must include at least one origin');
  }

  for (const origin of origins) {
    assertHttpOrigin(origin);
  }

  return origins.join(',');
}

function assertHttpOrigin(origin: string): void {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    throw new Error(`CORS_ORIGINS contains an invalid URL: ${origin}`);
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) {
    throw new Error(`CORS_ORIGINS contains an invalid origin: ${origin}`);
  }
}

function parseDatabaseUrl(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('DATABASE_URL is required');
  }

  const databaseUrl = value.trim();
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL');
  }

  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('DATABASE_URL must use the postgres or postgresql protocol');
  }

  return databaseUrl;
}

function parseNodeEnvironment(value: unknown): NodeEnvironment {
  if (value === undefined || value === '') {
    return 'development';
  }

  if (
    typeof value !== 'string' ||
    !NODE_ENVIRONMENTS.includes(value as NodeEnvironment)
  ) {
    throw new Error(
      `NODE_ENV must be one of: ${NODE_ENVIRONMENTS.join(', ')}`,
    );
  }

  return value as NodeEnvironment;
}
