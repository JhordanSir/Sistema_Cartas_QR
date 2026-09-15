import { basename, dirname, resolve } from 'node:path';

import { meetsPasswordPolicy } from '@sirio/shared';

const NODE_ENVIRONMENTS = ['development', 'test', 'production'] as const;
const DEFAULT_API_PORT = 3001;
const DEFAULT_CORS_ORIGINS = 'http://localhost:3000';
const DEFAULT_JWT_ACCESS_TTL = '15m';
const DEFAULT_JWT_REFRESH_TTL = '7d';
const DEFAULT_JWT_ISSUER = 'sirio-cartas-qr';
const DEFAULT_JWT_AUDIENCE = 'sirio-cartas-qr-api';
const MIN_SECRET_LENGTH = 32;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const DEFAULT_GEMINI_TIMEOUT_MS = 60_000;
const DEFAULT_GEMINI_MAX_RETRIES = 2;

type NodeEnvironment = (typeof NODE_ENVIRONMENTS)[number];

export interface Environment extends Record<string, unknown> {
  API_PORT: number;
  CORS_ORIGINS: string;
  DATABASE_URL: string;
  GEMINI_API_KEY: string;
  GEMINI_MAX_RETRIES: number;
  GEMINI_MODEL: string;
  GEMINI_TIMEOUT_MS: number;
  INITIAL_ADMIN_EMAIL: string;
  INITIAL_ADMIN_PASSWORD: string;
  JWT_ACCESS_SECRET: string;
  JWT_ACCESS_TTL_SECONDS: number;
  JWT_AUDIENCE: string;
  JWT_ISSUER: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_TTL_SECONDS: number;
  NODE_ENV: NodeEnvironment;
  PUBLIC_APP_URL: string;
  STORAGE_PATH: string;
  VIEW_IP_HASH_SECRET: string;
}

export const ROOT_ENV_FILE = resolveRootEnvFile(process.cwd());

export function validateEnvironment(
  rawEnvironment: Record<string, unknown>,
): Environment {
  const databaseUrl = parseDatabaseUrl(rawEnvironment.DATABASE_URL);
  const jwtAccessSecret = parseSecret(
    rawEnvironment.JWT_ACCESS_SECRET,
    'JWT_ACCESS_SECRET',
  );
  const jwtRefreshSecret = parseSecret(
    rawEnvironment.JWT_REFRESH_SECRET,
    'JWT_REFRESH_SECRET',
  );
  if (jwtAccessSecret === jwtRefreshSecret) {
    throw new Error('JWT access and refresh secrets must be different');
  }

  return {
    ...rawEnvironment,
    API_PORT: parsePort(rawEnvironment.API_PORT),
    CORS_ORIGINS: parseCorsOrigins(rawEnvironment.CORS_ORIGINS),
    DATABASE_URL: databaseUrl,
    GEMINI_API_KEY: parseRequiredString(
      rawEnvironment.GEMINI_API_KEY,
      'GEMINI_API_KEY',
    ),
    GEMINI_MAX_RETRIES: parseIntegerInRange(
      rawEnvironment.GEMINI_MAX_RETRIES,
      DEFAULT_GEMINI_MAX_RETRIES,
      0,
      4,
      'GEMINI_MAX_RETRIES',
    ),
    GEMINI_MODEL: parseNonEmptyString(
      rawEnvironment.GEMINI_MODEL,
      DEFAULT_GEMINI_MODEL,
      'GEMINI_MODEL',
    ),
    GEMINI_TIMEOUT_MS: parseIntegerInRange(
      rawEnvironment.GEMINI_TIMEOUT_MS,
      DEFAULT_GEMINI_TIMEOUT_MS,
      1_000,
      120_000,
      'GEMINI_TIMEOUT_MS',
    ),
    INITIAL_ADMIN_EMAIL: parseEmail(
      rawEnvironment.INITIAL_ADMIN_EMAIL,
      'INITIAL_ADMIN_EMAIL',
    ),
    INITIAL_ADMIN_PASSWORD: parsePassword(
      rawEnvironment.INITIAL_ADMIN_PASSWORD,
    ),
    JWT_ACCESS_SECRET: jwtAccessSecret,
    JWT_ACCESS_TTL_SECONDS: parseDurationSeconds(
      rawEnvironment.JWT_ACCESS_TTL,
      DEFAULT_JWT_ACCESS_TTL,
      'JWT_ACCESS_TTL',
    ),
    JWT_AUDIENCE: parseNonEmptyString(
      rawEnvironment.JWT_AUDIENCE,
      DEFAULT_JWT_AUDIENCE,
      'JWT_AUDIENCE',
    ),
    JWT_ISSUER: parseNonEmptyString(
      rawEnvironment.JWT_ISSUER,
      DEFAULT_JWT_ISSUER,
      'JWT_ISSUER',
    ),
    JWT_REFRESH_SECRET: jwtRefreshSecret,
    JWT_REFRESH_TTL_SECONDS: parseDurationSeconds(
      rawEnvironment.JWT_REFRESH_TTL,
      DEFAULT_JWT_REFRESH_TTL,
      'JWT_REFRESH_TTL',
    ),
    NODE_ENV: parseNodeEnvironment(rawEnvironment.NODE_ENV),
    PUBLIC_APP_URL: parseRequiredOrigin(
      rawEnvironment.PUBLIC_APP_URL,
      'PUBLIC_APP_URL',
    ),
    STORAGE_PATH: parseStoragePath(rawEnvironment.STORAGE_PATH),
    VIEW_IP_HASH_SECRET: parseSecret(
      rawEnvironment.VIEW_IP_HASH_SECRET,
      'VIEW_IP_HASH_SECRET',
    ),
  };
}

function parseRequiredString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${name} is required`);
  }
  return value.trim();
}

function parseIntegerInRange(
  value: unknown,
  defaultValue: number,
  minimum: number,
  maximum: number,
  name: string,
): number {
  const parsed = value === undefined || value === '' ? defaultValue : Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return parsed;
}

function parseStoragePath(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('STORAGE_PATH is required');
  }
  return resolve(dirname(ROOT_ENV_FILE), value.trim());
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

function parseRequiredOrigin(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${name} is required`);
  }
  const origin = value.trim().replace(/\/$/, '');
  try {
    assertHttpOrigin(origin);
  } catch {
    throw new Error(`${name} must be a valid HTTP origin`);
  }
  return origin;
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

function parseSecret(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length < MIN_SECRET_LENGTH) {
    throw new Error(`${name} must contain at least ${MIN_SECRET_LENGTH} characters`);
  }
  return value;
}

function parseEmail(value: unknown, name: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${name} must be a valid email address`);
  }
  const email = value.trim().toLowerCase();
  if (
    email.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error(`${name} must be a valid email address`);
  }
  return email;
}

function parsePassword(value: unknown): string {
  if (
    typeof value !== 'string' ||
    value.length < MIN_PASSWORD_LENGTH ||
    value.length > MAX_PASSWORD_LENGTH
  ) {
    throw new Error(
      `INITIAL_ADMIN_PASSWORD must contain between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`,
    );
  }
  // Checked here as well as in InitialAdminBootstrap so a weak value fails at boot
  // with its own name, instead of later inside the seed as a generic policy error.
  if (!meetsPasswordPolicy(value)) {
    throw new Error(
      'INITIAL_ADMIN_PASSWORD must contain an uppercase letter, a lowercase letter and a number',
    );
  }
  return value;
}

function parseDurationSeconds(
  value: unknown,
  defaultValue: string,
  name: string,
): number {
  const duration = value === undefined || value === '' ? defaultValue : value;
  if (typeof duration !== 'string') {
    throw new Error(`${name} must use a duration such as 15m or 7d`);
  }
  const match = /^(\d+)(s|m|h|d)$/.exec(duration);
  if (!match) {
    throw new Error(`${name} must use a duration such as 15m or 7d`);
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const multiplier =
    unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3_600 : 86_400;
  const seconds = amount * multiplier;
  if (!Number.isSafeInteger(seconds) || seconds < 1) {
    throw new Error(`${name} must be a positive duration`);
  }
  return seconds;
}

function parseNonEmptyString(
  value: unknown,
  defaultValue: string,
  name: string,
): string {
  const parsed = value === undefined || value === '' ? defaultValue : value;
  if (typeof parsed !== 'string' || parsed.trim() === '') {
    throw new Error(`${name} must be a non-empty string`);
  }
  return parsed.trim();
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
