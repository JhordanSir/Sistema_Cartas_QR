/**
 * @jest-environment node
 */
import { readNdjson } from './ndjson';

const encoder = new TextEncoder();

function bodyFrom(chunks: Array<string | Uint8Array>): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(typeof chunk === 'string' ? encoder.encode(chunk) : chunk);
      }
      controller.close();
    },
  });
}

async function collect<T>(body: ReadableStream<Uint8Array>) {
  const lines: Array<{ line: string; value: T }> = [];
  for await (const line of readNdjson<T>(body)) lines.push(line);
  return lines;
}

describe('readNdjson', () => {
  it('yields one object per line, with the raw line beside it', async () => {
    const lines = await collect<{ name: string }>(bodyFrom(['{"name":"Ceviche"}\n{"name":"Chicha"}\n']));

    expect(lines).toEqual([
      { line: '{"name":"Ceviche"}', value: { name: 'Ceviche' } },
      { line: '{"name":"Chicha"}', value: { name: 'Chicha' } },
    ]);
  });

  it('joins a line that arrives split across chunks', async () => {
    const lines = await collect<{ position: number }>(
      bodyFrom(['{"posi', 'tion":1}\n{"position"', ':2}\n']),
    );

    expect(lines.map(({ value }) => value.position)).toEqual([1, 2]);
  });

  it('keeps a multi-byte character whole when its bytes are split', async () => {
    const bytes = encoder.encode('{"name":"Piña"}\n');
    const cut = bytes.indexOf(0xc3) + 1;

    const lines = await collect<{ name: string }>(bodyFrom([bytes.slice(0, cut), bytes.slice(cut)]));

    expect(lines).toEqual([{ line: '{"name":"Piña"}', value: { name: 'Piña' } }]);
  });

  it('reads a last line without its newline and skips blank lines', async () => {
    const lines = await collect<{ position: number }>(bodyFrom(['{"position":1}\n\n', '{"position":2}']));

    expect(lines.map(({ value }) => value.position)).toEqual([1, 2]);
  });

  it('cancels the download when the reader stops early', async () => {
    const cancel = jest.fn();
    const body = new ReadableStream<Uint8Array>({
      cancel,
      pull(controller) {
        controller.enqueue(encoder.encode('{"position":1}\n'));
      },
    });

    for await (const line of readNdjson<{ position: number }>(body)) {
      expect(line.value.position).toBe(1);
      break;
    }

    expect(cancel).toHaveBeenCalled();
  });
});
