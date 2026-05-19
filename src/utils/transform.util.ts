import { Transform } from 'class-transformer';

export function coerceTransformValueInput(value: unknown): unknown {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (value === 'true' || value === 'false') {
    return toBoolean({ value });
  }

  if (typeof value === 'string') {
    const t = value.trim();
    if (t.startsWith('{') || t.startsWith('[')) {
      try {
        return JSON.parse(t);
      } catch {
        return value;
      }
    }
  }

  const num = toNumber({ value });
  if (num !== undefined) {
    return num;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  return value;
}

export function TransformValue() {
  return Transform(({ value }) => coerceTransformValueInput(value));
}

export function TransformPlainString() {
  return Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (typeof value === 'string') {
      const t = value.trim();
      return t || undefined;
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
