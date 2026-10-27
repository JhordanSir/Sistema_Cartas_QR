import type { ServerResponse } from 'node:http';
import { Writable } from 'node:stream';

/** Stands in for the HTTP response: records headers and everything written. */
export class RecordingResponse extends Writable {
  readonly chunks: string[] = [];
  flushed = false;
  readonly headers = new Map<string, string>();
  statusCode = 0;

  /** `disconnectAfter` chunks in, it goes away like a client closing the tab. */
  constructor(private readonly disconnectAfter = Infinity) {
    super();
  }

  get body(): string {
    return this.chunks.join('');
  }

  flushHeaders(): void {
    this.flushed = true;
  }

  setHeader(name: string, value: string): this {
    this.headers.set(name.toLowerCase(), value);
    return this;
  }

  override _write(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.chunks.push(chunk.toString());
    if (this.chunks.length >= this.disconnectAfter) {
      this.destroy();
      return;
    }
    callback();
  }
}

export function asResponse(response: RecordingResponse): ServerResponse {
  return response as unknown as ServerResponse;
}
