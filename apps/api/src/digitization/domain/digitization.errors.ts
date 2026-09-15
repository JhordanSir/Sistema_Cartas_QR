import {
  ApplicationError,
  type ApplicationErrorOptions,
} from '../../common/application-error.js';

export type DigitizationErrorCode =
  | 'EMPTY_MENU'
  | 'FORBIDDEN'
  | 'INVALID_IMAGE'
  | 'INVALID_INPUT'
  | 'INVALID_MODEL_RESPONSE'
  | 'MODEL_CONFIGURATION_ERROR'
  | 'MODEL_TIMEOUT'
  | 'MODEL_UNAVAILABLE'
  | 'RESTAURANT_NOT_FOUND';

export class DigitizationApplicationError extends ApplicationError<DigitizationErrorCode> {
  constructor(code: DigitizationErrorCode, message: string, options?: ApplicationErrorOptions) {
    super(code, message, options);
    this.name = 'DigitizationApplicationError';
  }
}

export type MenuExtractionFailureKind =
  | 'CONFIGURATION'
  | 'RESPONSE'
  | 'TIMEOUT'
  | 'UNAVAILABLE';

export class MenuExtractionGatewayError extends Error {
  constructor(
    readonly kind: MenuExtractionFailureKind,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'MenuExtractionGatewayError';
  }
}
