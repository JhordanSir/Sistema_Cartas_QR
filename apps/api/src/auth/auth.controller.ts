import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';

import { AuthApplicationService } from './application/auth.service.js';
import { AUTH_APPLICATION } from './auth.tokens.js';
import { AuthRole } from './domain/auth-role.js';
import type {
  AuthPrincipal,
  AuthTokenResponse,
} from './domain/auth.types.js';
import {
  ChangePasswordDto,
  LoginDto,
  RefreshTokenDto,
  ResetPasswordDto,
} from './presentation/auth.dto.js';
import {
  CurrentPrincipal,
  Public,
  Roles,
} from './presentation/auth.decorators.js';
import { throwAuthHttpError } from './presentation/auth-http.errors.js';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AUTH_APPLICATION)
    private readonly auth: AuthApplicationService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() input: LoginDto): Promise<AuthTokenResponse> {
    try {
      return await this.auth.login(input);
    } catch (error) {
      throwAuthHttpError(error);
    }
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() input: RefreshTokenDto): Promise<AuthTokenResponse> {
    try {
      return await this.auth.refresh(input.refreshToken);
    } catch (error) {
      throwAuthHttpError(error);
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() input: RefreshTokenDto): Promise<void> {
    try {
      await this.auth.logout(input.refreshToken);
    } catch (error) {
      throwAuthHttpError(error);
    }
  }

  @Get('me')
  getCurrentPrincipal(
    @CurrentPrincipal() principal: AuthPrincipal,
  ): Pick<AuthPrincipal, 'accountId' | 'email' | 'role'> {
    return {
      accountId: principal.accountId,
      email: principal.email,
      role: principal.role,
    };
  }

  @Roles(AuthRole.OWNER)
  @Post('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body() input: ChangePasswordDto,
  ): Promise<void> {
    try {
      await this.auth.changeOwnPassword({
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        principal,
      });
    } catch (error) {
      throwAuthHttpError(error);
    }
  }

  @Roles(AuthRole.ADMIN)
  @Post('admin/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changeAdminPassword(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body() input: ChangePasswordDto,
  ): Promise<void> {
    try {
      await this.auth.changeOwnPassword({
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        principal,
      });
    } catch (error) {
      throwAuthHttpError(error);
    }
  }

  @Roles(AuthRole.ADMIN)
  @Post('admin/owners/:ownerId/reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetOwnerPassword(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('ownerId', new ParseUUIDPipe({ version: '4' })) ownerId: string,
    @Body() input: ResetPasswordDto,
  ): Promise<void> {
    try {
      await this.auth.resetOwnerPassword({
        newPassword: input.newPassword,
        ownerId,
        principal,
      });
    } catch (error) {
      throwAuthHttpError(error);
    }
  }
}
