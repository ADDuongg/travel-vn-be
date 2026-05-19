import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { DomainException } from 'src/common/exceptions';
import { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema<any>) {}

  transform(value: any, _metadata: ArgumentMetadata) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const errors = result.error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`,
      );
      throw new DomainException(
        errors.join(', '),
        400,
        'BAD_REQUEST',
        'pipe.bad_request',
      );
    }
    return result.data;
  }
}
