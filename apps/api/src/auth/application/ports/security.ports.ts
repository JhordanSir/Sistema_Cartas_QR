import type {
  IssuedTokenPair,
  TokenSubject,
} from '../../domain/auth.types.js';

export interface PasswordHasher {
  hash(value: string): Promise<string>;
  verify(hash: string, value: string): Promise<boolean>;
}

export interface TokenService {
  issueTokenPair(subject: TokenSubject): Promise<IssuedTokenPair>;
  verifyAccessToken(token: string): Promise<TokenSubject>;
  verifyRefreshToken(token: string): Promise<TokenSubject>;
}

export interface SecretDigester {
  digest(value: string): string;
}

export interface IdentifierGenerator {
  generate(): string;
}

export interface Clock {
  now(): Date;
}
