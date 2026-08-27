export type MenuManagementErrorCode =
  | 'CATEGORY_NOT_FOUND'
  | 'FORBIDDEN'
  | 'INVALID_IMAGE'
  | 'INVALID_INPUT'
  | 'INVALID_ORDER'
  | 'PRODUCT_NOT_FOUND'
  | 'RESTAURANT_NOT_FOUND';

export class MenuManagementApplicationError extends Error {
  constructor(
    readonly code: MenuManagementErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'MenuManagementApplicationError';
  }
}
