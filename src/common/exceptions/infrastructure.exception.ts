import { COMMON_I18N_KEYS } from '../i18n/keys';
import { AppException } from './app.exception';

export class InfrastructureException extends AppException {
  readonly infraCause?: unknown;

  constructor(infraCause?: unknown) {
    super(
      'Internal server error',
      500,
      'INFRASTRUCTURE_ERROR',
      COMMON_I18N_KEYS.INTERNAL_ERROR,
    );
    this.name = 'InfrastructureException';
    this.infraCause = infraCause;
  }
}
