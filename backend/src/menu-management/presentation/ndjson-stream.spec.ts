import { RecordingResponse, asResponse } from '../../testing/recording-response.js';
import { NdjsonEncoder, PacingTransform, sendNdjson } from './ndjson-stream.js';

/** Stands in for the database: every object is an awaited read. */
async function* products(count: number, onClose?: () => void): AsyncGenerator<{ position: number }> {
  try {
    for (let position = 1; position <= count; position += 1) yield await Promise.resolve({ position });
  } finally {
    onClose?.();
  }
}

describe('NdjsonEncoder', () => {
  it('writes each object as one JSON line', async () => {
    const encoder = new NdjsonEncoder();
    const output: string[] = [];
    encoder.on('data', (chunk: Buffer) => output.push(chunk.toString()));

    encoder.write({ name: 'Ceviche', price: '35.00' });
    encoder.end({ name: 'Chicha', price: '8.00' });
    await new Promise((resolve) => encoder.once('end', resolve));

    expect(output.join('')).toBe('{"name":"Ceviche","price":"35.00"}\n{"name":"Chicha","price":"8.00"}\n');
    expect(encoder.lines).toBe(2);
  });
});

describe('PacingTransform', () => {
  it('holds every object for the requested pause', async () => {
    const pacing = new PacingTransform(25);
    const startedAt = performance.now();
    const received: unknown[] = [];
    pacing.on('data', (item: unknown) => received.push(item));

    pacing.write({ position: 1 });
    pacing.end({ position: 2 });
    await new Promise((resolve) => pacing.once('end', resolve));

    expect(received).toEqual([{ position: 1 }, { position: 2 }]);
    expect(performance.now() - startedAt).toBeGreaterThanOrEqual(45);
  });

  it('drops the pending object when destroyed mid-pause', async () => {
    const pacing = new PacingTransform(60_000);
    const received: unknown[] = [];
    pacing.on('data', (item: unknown) => received.push(item));

    pacing.write({ position: 1 });
    pacing.destroy();
    await new Promise((resolve) => pacing.once('close', resolve));

    expect(received).toEqual([]);
  });
});

describe('sendNdjson', () => {
  it('streams the objects as NDJSON with headers that keep proxies from buffering', async () => {
    const response = new RecordingResponse();

    const summary = await sendNdjson(products(3), asResponse(response), 0);

    expect(summary).toEqual({ cancelled: false, lines: 3 });
    expect(response.statusCode).toBe(200);
    expect(response.flushed).toBe(true);
    expect(Object.fromEntries(response.headers)).toEqual({
      'cache-control': 'no-store, no-transform',
      'content-type': 'application/x-ndjson; charset=utf-8',
      'x-accel-buffering': 'no',
    });
    expect(response.body).toBe('{"position":1}\n{"position":2}\n{"position":3}\n');
  });

  it('stops reading the source when the client disconnects', async () => {
    let sourceClosed = false;
    const response = new RecordingResponse(1);

    const summary = await sendNdjson(
      products(10_000, () => {
        sourceClosed = true;
      }),
      asResponse(response),
      0,
    );

    expect(summary.cancelled).toBe(true);
    expect(summary.lines).toBeLessThan(10_000);
    expect(sourceClosed).toBe(true);
  });

  it('rejects with the source error so the caller can log it', async () => {
    async function* failing(): AsyncGenerator<{ position: number }> {
      yield await Promise.resolve({ position: 1 });
      throw new Error('database went away');
    }

    await expect(sendNdjson(failing(), asResponse(new RecordingResponse()), 0)).rejects.toThrow(
      'database went away',
    );
  });
});
