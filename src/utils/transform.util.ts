// common/decorators/transform-value.decorator.ts
import { Transform } from 'class-transformer';

/**
 * Cùng logic ép kiểu như {@link TransformValue} (multipart / query / JSON string).
 * Dùng khi cần bước thêm (ví dụ `plainToInstance` từng phần tử mảng với @ValidateNested).
 */
export function coerceTransformValueInput(value: unknown): unknown {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  // ===== boolean =====
  if (value === 'true' || value === 'false') {
    return toBoolean({ value });
  }

  // ===== json (object | array) — trước toNumber để chuỗi JSON không bị ép số/Boolean =====
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

  // ===== number =====
  const num = toNumber({ value });
  if (num !== undefined) {
    return num;
  }

  // ===== json còn lại (ví dụ chuỗi số/quoted, ít dùng) =====
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

/**
 * Chuỗi thuần từ multipart/query: chỉ trim (không ép boolean/số/JSON như {@link TransformValue}).
 * Dùng khi cần giữ `"1"` là chuỗi (tên, mô tả, …) — cùng file util để tái sử dụng ở DTO.
 */
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
