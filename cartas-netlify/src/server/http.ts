import type { z } from 'zod';

import { GENERIC_ERROR_MESSAGE, type ApiErrorBody } from '../shared/messages';
import { describeErrorForLog } from './db-errors';

export const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/** An error the client is meant to see: it becomes `{ code, message, fields? }` with its status. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const INVALID_INPUT_MESSAGE = 'Revisa los datos e inténtalo de nuevo.';

/** 400 with one message per invalid field; the first one is the summary. */
export function validationError(fields: Record<string, string>): ApiError {
  const [first = INVALID_INPUT_MESSAGE] = Object.values(fields);
  return new ApiError(400, 'VALIDATION_ERROR', first, fields);
}

export function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

function errorResponse(error: ApiError): Response {
  const body: ApiErrorBody = { code: error.code, message: error.message };
  if (error.fields) body.fields = error.fields;
  return jsonResponse(body, error.status);
}

/**
 * Runs a Route Handler body. An ApiError becomes its JSON response; anything
 * else is logged on the server and answered with the generic message, so no
 * internal detail ever reaches the client.
 */
export async function handleApi(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof ApiError) return errorResponse(error);
    console.error('Unhandled API error', describeErrorForLog(error));
    return jsonResponse({ code: 'INTERNAL_ERROR', message: GENERIC_ERROR_MESSAGE }, 500);
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * An id from the URL or the body. Anything that is not a UUID could never
 * exist, so it gets the same 404 as an id of another restaurant.
 */
export function requireUuid(value: string, notFoundMessage: string): string {
  if (!UUID_PATTERN.test(value)) throw new ApiError(404, 'NOT_FOUND', notFoundMessage);
  return value.toLowerCase();
}

/** Parses a multipart (or urlencoded) body; a malformed one is a 400 INVALID_INPUT. */
export async function readFormData(request: Request): Promise<FormData> {
  try {
    return await request.formData();
  } catch {
    throw new ApiError(400, 'INVALID_INPUT', INVALID_INPUT_MESSAGE);
  }
}

/** A text field of a form, or '' when it is missing or is a file. */
export function formText(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

/** Parses the JSON body with a zod schema; any mismatch is a 400 INVALID_INPUT. */
export async function readJsonBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, 'INVALID_INPUT', INVALID_INPUT_MESSAGE);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ApiError(400, 'INVALID_INPUT', INVALID_INPUT_MESSAGE);
  return parsed.data;
}
