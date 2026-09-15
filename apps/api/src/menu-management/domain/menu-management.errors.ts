import {
  ApplicationError,
  type ApplicationErrorOptions,
} from '../../common/application-error.js';

export type MenuManagementErrorCode =
  | 'CATEGORY_NOT_FOUND'
  | 'FORBIDDEN'
  | 'INVALID_IMAGE'
  | 'INVALID_INPUT'
  | 'INVALID_ORDER'
  | 'PRODUCT_NOT_FOUND'
  | 'RESTAURANT_NOT_FOUND';

export class MenuManagementApplicationError extends ApplicationError<MenuManagementErrorCode> {
  constructor(code: MenuManagementErrorCode, message: string, options?: ApplicationErrorOptions) {
    super(code, message, options);
    this.name = 'MenuManagementApplicationError';
  }
}
