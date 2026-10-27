import { resolveUniqueSlug } from '@sirio/shared';

import type { AuthPrincipal } from '../../../auth/domain/auth.types.js';
import { RestaurantApplicationError } from '../../domain/restaurant.errors.js';
import { buildPublicRestaurantUrl } from '../../domain/restaurant-qr.js';
import type { RestaurantSummary } from '../../domain/restaurant.types.js';
import type { RestaurantRepository } from '../ports/restaurant.repository.js';
import type {
  RestaurantPasswordHasher,
  RestaurantQrRenderer,
} from '../ports/restaurant-services.js';
import {
  assertAdministrator,
  assertInitialPassword,
  normalizeOwnerEmail,
  normalizeRestaurantName,
} from '../restaurant.validation.js';

const MAX_SLUG_ALLOCATION_ATTEMPTS = 10;

export interface CreateRestaurantCommand {
  email: string;
  initialPassword: string;
  name: string;
  principal: AuthPrincipal;
}

export class CreateRestaurant {
  constructor(
    private readonly repository: RestaurantRepository,
    private readonly passwordHasher: RestaurantPasswordHasher,
    private readonly qrRenderer: RestaurantQrRenderer,
    private readonly publicOrigin: string,
  ) {}

  async execute(command: CreateRestaurantCommand): Promise<RestaurantSummary> {
    assertAdministrator(command.principal);
    const name = normalizeRestaurantName(command.name);
    const email = normalizeOwnerEmail(command.email);
    assertInitialPassword(command.initialPassword);
    const passwordHash = await this.passwordHasher.hash(command.initialPassword);

    for (let attempt = 0; attempt < MAX_SLUG_ALLOCATION_ATTEMPTS; attempt += 1) {
      const slug = await resolveUniqueSlug(name, (candidate) =>
        this.repository.slugExists(candidate),
      );
      const qrPayload = buildPublicRestaurantUrl(this.publicOrigin, slug);
      const [qrPng, qrSvg] = await Promise.all([
        this.qrRenderer.render(qrPayload, 'png'),
        this.qrRenderer.render(qrPayload, 'svg'),
      ]);
      const result = await this.repository.create({
        email,
        name,
        passwordHash,
        qrPayload,
        qrPng,
        qrSvg,
        slug,
      });

      if (result.kind === 'created') {
        return result.restaurant;
      }
      if (result.kind === 'email-conflict') {
        throw new RestaurantApplicationError(
          'EMAIL_ALREADY_EXISTS',
          'An owner account already uses this email',
        );
      }
    }

    throw new RestaurantApplicationError(
      'SLUG_ALLOCATION_FAILED',
      'A unique restaurant slug could not be allocated',
    );
  }
}
