import { AuthRole } from '../domain/auth-role.js';
import { AuthApplicationError } from '../domain/auth.errors.js';
import type {
  AuthAccount,
  AuthPrincipal,
  AuthTokenResponse,
  IssuedTokenPair,
} from '../domain/auth.types.js';
import type { AuthRepository } from './ports/auth.repository.js';
import type {
  Clock,
  IdentifierGenerator,
  PasswordHasher,
  SecretDigester,
  TokenService,
} from './ports/security.ports.js';
import {
  addSeconds,
  assertPasswordPolicy,
  normalizeEmail,
} from './auth.utils.js';

export interface LoginCommand {
  email: string;
  password: string;
  role: AuthRole;
}

export interface ChangePasswordCommand {
  currentPassword: string;
  newPassword: string;
  principal: AuthPrincipal;
}

export interface ResetOwnerPasswordCommand {
  newPassword: string;
  ownerId: string;
  principal: AuthPrincipal;
}

export class AuthApplicationService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly secretDigester: SecretDigester,
    private readonly identifiers: IdentifierGenerator,
    private readonly clock: Clock,
  ) {}

  async login(command: LoginCommand): Promise<AuthTokenResponse> {
    const account = await this.repository.findAccountByEmail(
      normalizeEmail(command.email),
      command.role,
    );

    if (!account?.isActive) {
      await this.passwordHasher.hash(command.password);
      throw new AuthApplicationError(
        'INVALID_CREDENTIALS',
        'Invalid email or password',
      );
    }

    const passwordMatches = await this.passwordHasher.verify(
      account.passwordHash,
      command.password,
    );
    if (!passwordMatches) {
      throw new AuthApplicationError(
        'INVALID_CREDENTIALS',
        'Invalid email or password',
      );
    }

    return this.startSession(account);
  }

  async refresh(refreshToken: string): Promise<AuthTokenResponse> {
    const subject = await this.tokenService.verifyRefreshToken(refreshToken);
    const now = this.clock.now();
    const principal = await this.repository.findActivePrincipal(
      subject.sessionId,
      subject.accountId,
      subject.role,
      now,
    );
    if (!principal) {
      throw new AuthApplicationError('INVALID_TOKEN', 'Invalid refresh token');
    }

    const tokens = await this.tokenService.issueTokenPair(subject);
    const rotated = await this.repository.rotateSession({
      currentDigest: this.secretDigester.digest(refreshToken),
      expiresAt: addSeconds(now, tokens.refreshExpiresIn),
      id: subject.sessionId,
      newDigest: this.secretDigester.digest(tokens.refreshToken),
      now,
    });

    if (!rotated) {
      await this.repository.revokeSession(subject.sessionId, now);
      throw new AuthApplicationError(
        'INVALID_TOKEN',
        'Refresh token reuse detected',
      );
    }

    return this.toTokenResponse(principal, tokens);
  }

  async logout(refreshToken: string): Promise<void> {
    const subject = await this.tokenService.verifyRefreshToken(refreshToken);
    await this.repository.revokeSessionByDigest(
      subject.sessionId,
      this.secretDigester.digest(refreshToken),
      this.clock.now(),
    );
  }

  async authenticateAccessToken(accessToken: string): Promise<AuthPrincipal> {
    const subject = await this.tokenService.verifyAccessToken(accessToken);
    const principal = await this.repository.findActivePrincipal(
      subject.sessionId,
      subject.accountId,
      subject.role,
      this.clock.now(),
    );

    if (!principal) {
      throw new AuthApplicationError('INVALID_TOKEN', 'Invalid access token');
    }

    return principal;
  }

  async changeOwnPassword(command: ChangePasswordCommand): Promise<void> {
    assertPasswordPolicy(command.newPassword);

    const account = await this.repository.findAccountById(
      command.principal.accountId,
      command.principal.role,
    );
    if (!account?.isActive) {
      throw new AuthApplicationError('ACCOUNT_NOT_FOUND', 'Account not found');
    }

    const currentPasswordMatches = await this.passwordHasher.verify(
      account.passwordHash,
      command.currentPassword,
    );
    if (!currentPasswordMatches) {
      throw new AuthApplicationError(
        'CURRENT_PASSWORD_INVALID',
        'Current password is invalid',
      );
    }
    if (command.currentPassword === command.newPassword) {
      throw new AuthApplicationError(
        'PASSWORD_REUSE',
        'New password must be different from the current password',
      );
    }

    const now = this.clock.now();
    const passwordHash = await this.passwordHasher.hash(command.newPassword);
    await this.repository.replacePasswordAndRevokeSessions(
      account.id,
      command.principal.role,
      passwordHash,
      now,
    );
  }

  async resetOwnerPassword(command: ResetOwnerPasswordCommand): Promise<void> {
    if (command.principal.role !== AuthRole.ADMIN) {
      throw new AuthApplicationError(
        'FORBIDDEN',
        'Only administrators can reset owner passwords',
      );
    }
    assertPasswordPolicy(command.newPassword);

    const owner = await this.repository.findAccountById(
      command.ownerId,
      AuthRole.OWNER,
    );
    if (!owner) {
      throw new AuthApplicationError('ACCOUNT_NOT_FOUND', 'Owner not found');
    }

    const now = this.clock.now();
    const passwordHash = await this.passwordHasher.hash(command.newPassword);
    await this.repository.replacePasswordAndRevokeSessions(
      owner.id,
      AuthRole.OWNER,
      passwordHash,
      now,
    );
  }

  async ownerCanAccessRestaurant(
    principal: AuthPrincipal,
    restaurantId: string,
  ): Promise<boolean> {
    if (principal.role !== AuthRole.OWNER) {
      return false;
    }

    return this.repository.ownerHasRestaurant(
      principal.accountId,
      restaurantId,
    );
  }

  private async startSession(
    account: AuthAccount,
  ): Promise<AuthTokenResponse> {
    const sessionId = this.identifiers.generate();
    const subject = {
      accountId: account.id,
      role: account.role,
      sessionId,
    };
    const tokens = await this.tokenService.issueTokenPair(subject);
    const now = this.clock.now();

    await this.repository.createSession({
      accountId: account.id,
      expiresAt: addSeconds(now, tokens.refreshExpiresIn),
      id: sessionId,
      refreshTokenDigest: this.secretDigester.digest(tokens.refreshToken),
      role: account.role,
    });

    return this.toTokenResponse(
      {
        accountId: account.id,
        email: account.email,
        role: account.role,
        sessionId,
      },
      tokens,
    );
  }

  private toTokenResponse(
    principal: AuthPrincipal,
    tokens: IssuedTokenPair,
  ): AuthTokenResponse {
    return {
      ...tokens,
      principal: {
        accountId: principal.accountId,
        email: principal.email,
        role: principal.role,
      },
      tokenType: 'Bearer',
    };
  }
}
