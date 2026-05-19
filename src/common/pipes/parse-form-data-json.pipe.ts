import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseFormDataJsonPipe implements PipeTransform {
  transform(value: any, _metadata: ArgumentMetadata) {
    if (!value || typeof value !== 'object') return value;

    for (const key of Object.keys(value)) {
      const field = value[key];

      if (typeof field === 'string') {
        const firstChar = field.trim().charAt(0);

        if (firstChar === '{' || firstChar === '[') {
          try {
            value[key] = JSON.parse(field);
          } catch {
            void 0;
          }
        }
      }
    }

    return value;
  }
}
