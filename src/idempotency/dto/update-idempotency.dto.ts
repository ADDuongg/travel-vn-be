import { PartialType } from '@nestjs/swagger';
import { CreateIdempotencyDto } from './create-idempotency.dto';

export class UpdateIdempotencyDto extends PartialType(CreateIdempotencyDto) {}
