import type { ServerResponse } from 'node:http';
import { Readable, Transform, type TransformCallback } from 'node:stream';
import { pipeline } from 'node:stream/promises';

/**
 * Holds each object `delayMs` before passing it on, so a short list can be
 * watched arriving. Being an object-mode stage, it also shows backpressure:
 * while it waits, the stages before it stop being read.
 */
export class PacingTransform extends Transform {
  private timer: NodeJS.Timeout | undefined;

  constructor(private readonly delayMs: number) {
    super({ objectMode: true });
  }

  override _transform(item: unknown, _encoding: BufferEncoding, callback: TransformCallback): void {
    if (this.delayMs === 0) {
      callback(null, item);
      return;
    }
    this.timer = setTimeout(() => {
      this.timer = undefined;
      callback(null, item);
    }, this.delayMs);
  }

  override _destroy(error: Error | null, callback: (error?: Error | null) => void): void {
    clearTimeout(this.timer);
    callback(error);
  }
}

/** Turns each object into one line of NDJSON: its JSON text followed by "\n". */
export class NdjsonEncoder extends Transform {
  lines = 0;

  constructor() {
    // Objects come in; text goes out, which is what an HTTP response accepts.
    super({ writableObjectMode: true });
  }

  override _transform(item: unknown, _encoding: BufferEncoding, callback: TransformCallback): void {
    this.lines += 1;
    callback(null, `${JSON.stringify(item)}\n`);
  }
}

export interface NdjsonStreamSummary {
  /** True when the client went away before the last object. */
  cancelled: boolean;
  lines: number;
}

/**
 * Sends the objects as NDJSON. `pipeline` connects the stages with
 * backpressure and, if any of them fails or the client disconnects, destroys
 * all of them: destroying the source ends the async generator, so nothing more
 * is read from the database.
 */
export async function sendNdjson(
  objects: AsyncIterable<unknown>,
  response: ServerResponse,
  delayMs: number,
): Promise<NdjsonStreamSummary> {
  response.statusCode = 200;
  response.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  // no-transform keeps compression layers from holding chunks back, and
  // X-Accel-Buffering tells Nginx to forward each one as soon as it arrives.
  response.setHeader('Cache-Control', 'no-store, no-transform');
  response.setHeader('X-Accel-Buffering', 'no');
  response.flushHeaders();

  const encoder = new NdjsonEncoder();
  try {
    await pipeline(Readable.from(objects), new PacingTransform(delayMs), encoder, response);
    return { cancelled: false, lines: encoder.lines };
  } catch (error) {
    if (isPrematureClose(error)) return { cancelled: true, lines: encoder.lines };
    throw error;
  }
}

/** Read by its code: Node's own errors may come from another realm (as under Jest). */
function isPrematureClose(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ERR_STREAM_PREMATURE_CLOSE'
  );
}
