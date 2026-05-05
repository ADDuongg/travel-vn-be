import { AppException } from './app.exception';

/**
 * Dependency / internal failure. Response body uses a generic message; details stay server-side.
 */
export class InfrastructureException extends AppException {
  readonly infraCause?: unknown;

  constructor(infraCause?: unknown) {
    super('Internal server error', 500, 'INFRASTRUCTURE_ERROR');
    this.name = 'InfrastructureException';
    this.infraCause = infraCause;
  }
}
