import type { AuthRole as PrismaAuthRole } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type {
  AuthRepository,
  CreateSessionInput,
  RotateSessionInput,
} from '../application/ports/auth.repository.js';
import { AuthRole } from '../domain/auth-role.js';
import type {
  AuthAccount,
  AuthPrincipal,
} from '../domain/auth.types.js';

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(input: CreateSessionInput): Promise<void> {
    await this.prisma.authSession.create({
      data: {
        adminId: input.role === AuthRole.ADMIN ? input.accountId : null,
        expiresAt: input.expiresAt,
        id: input.id,
        ownerId: input.role === AuthRole.OWNER ? input.accountId : null,
        refreshTokenDigest: input.refreshTokenDigest,
        role: this.toPrismaRole(input.role),
      },
    });
  }

  async ensureAdmin(
    email: string,
    passwordHash: string,
  ): Promise<AuthAccount> {
    const admin = await this.prisma.admin.upsert({
      create: { email, passwordHash },
      update: {},
      where: { email },
    });

    return {
      email: admin.email,
      id: admin.id,
      isActive: admin.isActive,
      passwordHash: admin.passwordHash,
      role: AuthRole.ADMIN,
    };
  }

  async findAccountByEmail(
    email: string,
    role: AuthRole,
  ): Promise<AuthAccount | null> {
    if (role === AuthRole.OWNER) {
      const owner = await this.prisma.owner.findUnique({ where: { email } });
      return owner
        ? {
            email: owner.email,
            id: owner.id,
            isActive: owner.isActive,
            passwordHash: owner.passwordHash,
            role,
          }
        : null;
    }

    const admin = await this.prisma.admin.findUnique({ where: { email } });
    return admin
      ? {
          email: admin.email,
          id: admin.id,
          isActive: admin.isActive,
          passwordHash: admin.passwordHash,
          role,
        }
      : null;
  }

  async findAccountById(
    accountId: string,
    role: AuthRole,
  ): Promise<AuthAccount | null> {
    if (role === AuthRole.OWNER) {
      const owner = await this.prisma.owner.findUnique({
        where: { id: accountId },
      });
      return owner
        ? {
            email: owner.email,
            id: owner.id,
            isActive: owner.isActive,
            passwordHash: owner.passwordHash,
            role,
          }
        : null;
    }

    const admin = await this.prisma.admin.findUnique({
      where: { id: accountId },
    });
    return admin
      ? {
          email: admin.email,
          id: admin.id,
          isActive: admin.isActive,
          passwordHash: admin.passwordHash,
          role,
        }
      : null;
  }

  async findActivePrincipal(
    sessionId: string,
    accountId: string,
    role: AuthRole,
    now: Date,
  ): Promise<AuthPrincipal | null> {
    if (role === AuthRole.OWNER) {
      const session = await this.prisma.authSession.findFirst({
        include: { owner: true },
        where: {
          expiresAt: { gt: now },
          id: sessionId,
          ownerId: accountId,
          revokedAt: null,
          role: this.toPrismaRole(role),
        },
      });
      if (!session?.owner?.isActive) {
        return null;
      }
      return {
        accountId,
        email: session.owner.email,
        role,
        sessionId,
      };
    }

    const session = await this.prisma.authSession.findFirst({
      include: { admin: true },
      where: {
        adminId: accountId,
        expiresAt: { gt: now },
        id: sessionId,
        revokedAt: null,
        role: this.toPrismaRole(role),
      },
    });
    if (!session?.admin?.isActive) {
      return null;
    }
    return {
      accountId,
      email: session.admin.email,
      role,
      sessionId,
    };
  }

  async ownerHasRestaurant(
    ownerId: string,
    restaurantId: string,
  ): Promise<boolean> {
    const count = await this.prisma.restaurantOwner.count({
      where: { ownerId, restaurantId },
    });
    return count > 0;
  }

  async replacePasswordAndRevokeSessions(
    accountId: string,
    role: AuthRole,
    passwordHash: string,
    revokedAt: Date,
  ): Promise<void> {
    const sessionFilter =
      role === AuthRole.OWNER ? { ownerId: accountId } : { adminId: accountId };
    const updateAccount =
      role === AuthRole.OWNER
        ? this.prisma.owner.update({
            data: { passwordHash },
            where: { id: accountId },
          })
        : this.prisma.admin.update({
            data: { passwordHash },
            where: { id: accountId },
          });

    await this.prisma.$transaction([
      updateAccount,
      this.prisma.authSession.updateMany({
        data: { revokedAt },
        where: { ...sessionFilter, revokedAt: null },
      }),
    ]);
  }

  async revokeSession(sessionId: string, revokedAt: Date): Promise<void> {
    await this.prisma.authSession.updateMany({
      data: { revokedAt },
      where: { id: sessionId, revokedAt: null },
    });
  }

  async revokeSessionByDigest(
    sessionId: string,
    refreshTokenDigest: string,
    revokedAt: Date,
  ): Promise<boolean> {
    const result = await this.prisma.authSession.updateMany({
      data: { revokedAt },
      where: {
        id: sessionId,
        refreshTokenDigest,
        revokedAt: null,
      },
    });
    return result.count === 1;
  }

  async rotateSession(input: RotateSessionInput): Promise<boolean> {
    const result = await this.prisma.authSession.updateMany({
      data: {
        expiresAt: input.expiresAt,
        lastUsedAt: input.now,
        refreshTokenDigest: input.newDigest,
      },
      where: {
        expiresAt: { gt: input.now },
        id: input.id,
        refreshTokenDigest: input.currentDigest,
        revokedAt: null,
      },
    });
    return result.count === 1;
  }

  private toPrismaRole(role: AuthRole): PrismaAuthRole {
    return role;
  }
}
