import { createHash, randomUUID } from 'node:crypto';

import type {
  Clock,
  IdentifierGenerator,
  SecretDigester,
} from '../application/ports/security.ports.js';

export class Sha256SecretDigester implements SecretDigester {
  digest(value: string): string {
    return createHash('sha256').update(value, 'utf8').digest('hex');
  }
}

export class CryptoIdentifierGenerator implements IdentifierGenerator {
  generate(): string {
    return randomUUID();
  }
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
