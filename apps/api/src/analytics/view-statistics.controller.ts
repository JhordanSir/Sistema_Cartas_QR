import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AuthRole } from '../auth/domain/auth-role.js';
import { OwnerRestaurantGuard } from '../auth/presentation/owner-restaurant.guard.js';
import { Public, Roles } from '../auth/presentation/auth.decorators.js';
import { GetRestaurantViewStatistics } from './application/use-cases/get-restaurant-view-statistics.js';
import { RecordPublicView } from './application/use-cases/record-public-view.js';
import type { RestaurantViewStatistics } from './domain/view-statistics.types.js';
import {
  GET_RESTAURANT_VIEW_STATISTICS,
  RECORD_PUBLIC_VIEW,
} from './view-statistics.tokens.js';

@Controller()
export class ViewStatisticsController {
  constructor(
    @Inject(RECORD_PUBLIC_VIEW)
    private readonly recordPublicView: RecordPublicView,
    @Inject(GET_RESTAURANT_VIEW_STATISTICS)
    private readonly getRestaurantViewStatistics: GetRestaurantViewStatistics,
  ) {}

  @Public()
  @Post('restaurants/public/:slug/view')
  @HttpCode(HttpStatus.NO_CONTENT)
  async recordView(
    @Param('slug') slug: string,
    @Headers('x-sirio-visitor-ip') visitorIp?: string,
  ): Promise<void> {
    await this.recordPublicView.execute({ slug, visitorIp: visitorIp ?? '' });
  }

  @Roles(AuthRole.OWNER)
  @UseGuards(OwnerRestaurantGuard)
  @Get('owner/restaurants/:restaurantId/statistics')
  ownerStatistics(
    @Param('restaurantId', new ParseUUIDPipe({ version: '4' })) restaurantId: string,
  ): Promise<RestaurantViewStatistics> {
    return this.requireStatistics(restaurantId);
  }

  @Roles(AuthRole.ADMIN)
  @Get('backoffice/restaurants/:restaurantId/statistics')
  backofficeStatistics(
    @Param('restaurantId', new ParseUUIDPipe({ version: '4' })) restaurantId: string,
  ): Promise<RestaurantViewStatistics> {
    return this.requireStatistics(restaurantId);
  }

  private async requireStatistics(
    restaurantId: string,
  ): Promise<RestaurantViewStatistics> {
    const statistics = await this.getRestaurantViewStatistics.execute({ restaurantId });
    if (!statistics) throw new NotFoundException('Restaurant not found');
    return statistics;
  }
}
