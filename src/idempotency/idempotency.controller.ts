import { Controller } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service';

@Controller('idempotency')
export class IdempotencyController {
  constructor(private readonly idempotencyService: IdempotencyService) {}
}
