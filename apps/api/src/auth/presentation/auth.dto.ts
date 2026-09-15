import {
  IsEmail,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from '../application/auth.utils.js';
import { AuthRole } from '../domain/auth-role.js';

export class LoginDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MaxLength(MAX_PASSWORD_LENGTH)
  @MinLength(MIN_PASSWORD_LENGTH)
  password!: string;

  @IsEnum(AuthRole)
  role!: AuthRole;
}

export class RefreshTokenDto {
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}

// A new password is checked by assertPasswordPolicy, which names the broken rule
// (PASSWORD_LENGTH or PASSWORD_COMPLEXITY). The current one is compared against its
// hash, so a wrong length simply reads as CURRENT_PASSWORD_INVALID.
export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  newPassword!: string;
}

export class ResetPasswordDto {
  @IsString()
  newPassword!: string;
}
