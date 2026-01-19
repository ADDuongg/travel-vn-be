// common/decorators/transform-value.decorator.ts
import { Transform } from 'class-transformer';

export function TransformValue() {
  return Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    // ===== boolean =====
    if (
      value === 'true' ||
      value === 'false' ||
      value === '1' ||
      value === '0'
    ) {
      return toBoolean({ value });
    }

    // ===== number =====
    const num = toNumber({ value });
    if (num !== undefined) {
      return num;
    }

    // ===== json (object | array) =====
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }

    return value;
  });
}
export const toBoolean = ({ value }: { value: any }): boolean => {
  if (typeof value === 'boolean') return value;

  if (typeof value === 'string') {
    return value === 'true' || value === '1';
  }

  return false;
};

export const toNumber = ({ value }: { value: any }): number | undefined => {
  if (value === null || value === undefined || value === '') {
    return undefined as any;
  }

  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
};
