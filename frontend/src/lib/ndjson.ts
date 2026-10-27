export interface NdjsonLine<T> {
  /** The line exactly as it arrived, without its "\n". */
  line: string;
  value: T;
}

/**
 * Reads an NDJSON body while it downloads, one parsed object per line.
 *
 * Network chunks ignore line boundaries: a line can arrive split in two, and
 * so can a multi-byte character such as "ñ". The decoder therefore keeps its
 * state between chunks, and the unfinished tail waits for the next chunk.
 * Stopping early (breaking out of the loop) cancels the download.
 */
export async function* readNdjson<T>(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<NdjsonLine<T>, void, undefined> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  let finished = false;
  try {
    while (!finished) {
      const { done, value } = await reader.read();
      finished = done;
      pending += done ? decoder.decode() : decoder.decode(value, { stream: true });
      const lines = pending.split('\n');
      // Without a closing "\n" the last piece may be half a line: keep it.
      pending = finished ? '' : (lines.pop() ?? '');
      for (const line of lines) {
        if (line.trim() !== '') yield { line, value: JSON.parse(line) as T };
      }
    }
  } finally {
    if (!finished) await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
