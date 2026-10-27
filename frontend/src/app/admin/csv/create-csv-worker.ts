/**
 * The bundler sees `new URL(..., import.meta.url)` inside `new Worker()` and emits
 * the worker as its own script. Kept in its own module so the screen's tests can
 * replace it: Jest runs CommonJS, where import.meta does not exist.
 */
export function createCsvWorker(): Worker {
  return new Worker(new URL('./csv.worker.ts', import.meta.url), { name: 'csv-worker', type: 'module' });
}
