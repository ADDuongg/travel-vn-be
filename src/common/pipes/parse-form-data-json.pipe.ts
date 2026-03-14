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
            // Chỉ parse JSON nếu là object/array string
            // Các field primitive (slug, code, ...) sẽ giữ nguyên
            value[key] = JSON.parse(field);
          } catch {
            // Ignore invalid JSON, giữ nguyên giá trị
          }
        }
      }
    }

    return value;
  }
}
