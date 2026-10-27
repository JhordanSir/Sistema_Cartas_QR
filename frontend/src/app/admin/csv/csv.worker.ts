import { createCsvEngine } from './csv-engine';
import type { CsvWorkerRequest, CsvWorkerResponse } from './csv-protocol';

// The project compiles against the DOM library, where `self` is a Window. Inside a
// dedicated worker only these two members matter, so they are typed by hand.
interface DedicatedWorkerScope {
  addEventListener(type: 'message', listener: (event: MessageEvent<CsvWorkerRequest>) => void): void;
  postMessage(message: CsvWorkerResponse): void;
}

const scope = self as unknown as DedicatedWorkerScope;
const engine = createCsvEngine((response) => scope.postMessage(response));

scope.addEventListener('message', (event) => {
  void engine.handle(event.data);
});
